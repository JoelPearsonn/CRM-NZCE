import { verifyPassword } from "@/lib/portal-crypto";
import { prisma } from "@/lib/prisma";
import { normalizeStaffEmail, staffPasswordHashFor } from "@/lib/staff-auth";

type StaffEnv = Record<string, string | undefined>;

export async function findStaffAgent(
  emailRaw: string,
  db: { agent: { findUnique: typeof prisma.agent.findUnique } } = prisma,
) {
  const email = normalizeStaffEmail(emailRaw);
  if (!email) return null;
  return db.agent.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, passwordHash: true },
  });
}

export async function authenticateStaff(
  input: { email?: string; password?: string },
  db: { agent: { findUnique: typeof prisma.agent.findUnique } } = prisma,
  env: StaffEnv = process.env,
) {
  const email = normalizeStaffEmail(input.email ?? "");
  const password = input.password ?? "";
  if (!email) return { error: "Use your @nzcenergy.co.uk work email." };
  const agent = await findStaffAgent(email, db);
  if (!agent) return { error: "No staff login for that work email." };
  const hash = staffPasswordHashFor(agent.email, agent.passwordHash, env);
  if (!hash) return { error: "Staff sign-in is not set for that work email." };
  if (!verifyPassword(password, hash)) return { error: "Email or password is not right." };
  return {
    ok: true as const,
    agent: { id: agent.id, name: agent.name, email: agent.email, role: agent.role },
  };
}
