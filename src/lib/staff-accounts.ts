import { DESK_ADMIN_EMAIL } from "@/lib/constants";
import { hashPassword, verifyPassword } from "@/lib/portal-crypto";
import { prisma } from "@/lib/prisma";
import {
  normalizeStaffEmail,
  publicAgentOf,
  staffHasPassword,
  staffPasswordHashFor,
  type PublicAgent,
} from "@/lib/staff-auth";
import {
  consumeStaffVerifyToken,
  readStaffVerifyToken,
} from "@/lib/staff-verify";

export const STAFF_PASSWORD_MIN_LENGTH = 10;

type StaffLookupDb = {
  agent: { findUnique: typeof prisma.agent.findUnique };
};

type StaffWriteDb = {
  agent: {
    findUnique: typeof prisma.agent.findUnique;
    create: typeof prisma.agent.create;
    update: typeof prisma.agent.update;
  };
  staffVerifyToken: {
    findUnique: typeof prisma.staffVerifyToken.findUnique;
    update: typeof prisma.staffVerifyToken.update;
    create: typeof prisma.staffVerifyToken.create;
    delete: typeof prisma.staffVerifyToken.delete;
    deleteMany: typeof prisma.staffVerifyToken.deleteMany;
  };
};

export type StaffEmailStep =
  | { error: string }
  | { step: "verify"; email: string }
  | { step: "signin"; email: string };

function nameFromWorkEmail(email: string) {
  const local = email.split("@")[0] ?? email;
  const named = local
    .split(".")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return named || email;
}

function publicAgent(agent: {
  id: string;
  name: string;
  email: string;
  role: string;
}): PublicAgent {
  return publicAgentOf({ id: agent.id, name: agent.name, email: agent.email, role: agent.role });
}

export async function findStaffAgent(emailRaw: string, db: StaffLookupDb = prisma) {
  const email = normalizeStaffEmail(emailRaw);
  if (!email) return null;
  return db.agent.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, passwordHash: true },
  });
}

export async function staffEmailLoginStep(
  emailRaw: string,
  db: StaffLookupDb = prisma,
): Promise<StaffEmailStep> {
  const email = normalizeStaffEmail(emailRaw);
  if (!email) return { error: "Use your @nzcenergy.co.uk work email." };
  const agent = await findStaffAgent(email, db);
  if (agent && staffHasPassword(agent.email, agent.passwordHash)) {
    return { step: "signin", email };
  }
  return { step: "verify", email };
}

async function storeStaffPassword(
  email: string,
  password: string,
  db: StaffWriteDb,
): Promise<{ error: string } | { ok: true; agent: PublicAgent }> {
  const existing = await findStaffAgent(email, db);
  if (existing && staffHasPassword(existing.email, existing.passwordHash)) {
    return { error: "This work email already has a password. Sign in instead." };
  }

  const passwordHash = hashPassword(password);
  if (existing) {
    const agent = await db.agent.update({
      where: { id: existing.id },
      data: { passwordHash },
      select: { id: true, name: true, email: true, role: true },
    });
    return { ok: true, agent: publicAgent(agent) };
  }

  const agent = await db.agent.create({
    data: {
      name: nameFromWorkEmail(email),
      email,
      role: email === DESK_ADMIN_EMAIL.toLowerCase() ? "Admin" : "Sales",
      passwordHash,
    },
    select: { id: true, name: true, email: true, role: true },
  });
  return { ok: true, agent: publicAgent(agent) };
}

/** First-time password only after a valid, unused verification token. */
export async function createStaffPasswordFromToken(
  input: { token?: string; password?: string; confirm?: string },
  db: StaffWriteDb = prisma,
  now = Date.now(),
): Promise<{ error: string; status?: 401 } | { ok: true; agent: PublicAgent }> {
  const password = input.password ?? "";
  const confirm = input.confirm ?? "";
  const verified = await readStaffVerifyToken(input.token, db, now);
  if ("error" in verified) return verified;
  if (password.length < STAFF_PASSWORD_MIN_LENGTH) {
    return { error: `Use at least ${STAFF_PASSWORD_MIN_LENGTH} characters.` };
  }
  if (password !== confirm) return { error: "Those passwords do not match." };

  const stored = await storeStaffPassword(verified.email, password, db);
  if ("error" in stored) return stored;
  await consumeStaffVerifyToken(verified.id, db);
  return stored;
}

export async function authenticateStaff(
  input: { email?: string; password?: string },
  db: StaffLookupDb = prisma,
) {
  const email = normalizeStaffEmail(input.email ?? "");
  const password = input.password ?? "";
  if (!email) return { error: "Use your @nzcenergy.co.uk work email." };
  const agent = await findStaffAgent(email, db);
  if (!agent) return { error: "No staff login for that work email." };
  const hash = staffPasswordHashFor(agent.email, agent.passwordHash);
  if (!hash) return { error: "Open the verification email before creating a password." };
  if (!verifyPassword(password, hash)) return { error: "Email or password is not right." };
  return { ok: true as const, agent: publicAgent(agent) };
}
