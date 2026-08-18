import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { normalizeStaffEmail, staffHasPassword } from "@/lib/staff-auth";
import {
  deskPublicOrigin,
  MAIL_NOT_SET_UP,
  sendStaffVerificationEmail,
  staffMailerReady,
} from "@/lib/staff-mail";

export const STAFF_VERIFY_MS = 60 * 60 * 1000;

type VerifyDb = {
  staffVerifyToken: {
    create: typeof prisma.staffVerifyToken.create;
    delete: typeof prisma.staffVerifyToken.delete;
    deleteMany: typeof prisma.staffVerifyToken.deleteMany;
    findUnique: typeof prisma.staffVerifyToken.findUnique;
    update: typeof prisma.staffVerifyToken.update;
  };
  agent: { findUnique: typeof prisma.agent.findUnique };
};

export type StaffVerifyRead =
  | { error: string; status: 401 }
  | { id: string; email: string };

export function hashStaffVerifyToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function issueStaffVerifyToken(
  emailRaw: string,
  db: VerifyDb = prisma,
  now = Date.now(),
) {
  const email = normalizeStaffEmail(emailRaw);
  if (!email) return { error: "Use your @nzcenergy.co.uk work email." };
  await db.staffVerifyToken.deleteMany({ where: { email, usedAt: null } });
  const raw = randomBytes(32).toString("base64url");
  const row = await db.staffVerifyToken.create({
    data: {
      email,
      tokenHash: hashStaffVerifyToken(raw),
      expiresAt: new Date(now + STAFF_VERIFY_MS),
    },
    select: { id: true },
  });
  return { raw, id: row.id, email };
}

export async function readStaffVerifyToken(
  raw: string | undefined | null,
  db: VerifyDb = prisma,
  now = Date.now(),
): Promise<StaffVerifyRead> {
  const token = raw?.trim() ?? "";
  if (!token) return { error: "This verification link is not valid.", status: 401 };
  const row = await db.staffVerifyToken.findUnique({
    where: { tokenHash: hashStaffVerifyToken(token) },
    select: { id: true, email: true, expiresAt: true, usedAt: true },
  });
  if (!row) return { error: "This verification link is not valid.", status: 401 };
  if (row.usedAt) return { error: "This verification link has already been used.", status: 401 };
  if (row.expiresAt.getTime() <= now) {
    return { error: "This verification link has expired.", status: 401 };
  }
  const email = normalizeStaffEmail(row.email);
  if (!email) return { error: "This verification link is not valid.", status: 401 };
  return { id: row.id, email };
}

export async function consumeStaffVerifyToken(id: string, db: VerifyDb = prisma) {
  await db.staffVerifyToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export async function startStaffEmailVerification(
  emailRaw: string,
  deps: {
    db?: VerifyDb;
    env?: Record<string, string | undefined>;
    now?: number;
    publicOrigin?: string | null;
    requestOrigin?: string | null;
    send?: typeof sendStaffVerificationEmail;
  } = {},
): Promise<{ error: string } | { ok: true; email: string }> {
  const db = deps.db ?? prisma;
  const env = deps.env ?? process.env;
  const email = normalizeStaffEmail(emailRaw);
  if (!email) return { error: "Use your @nzcenergy.co.uk work email." };

  const agent = await db.agent.findUnique({
    where: { email },
    select: { email: true, passwordHash: true },
  });
  if (agent && staffHasPassword(agent.email, agent.passwordHash)) {
    return { error: "This work email already has a password. Sign in instead." };
  }
  if (!staffMailerReady(env)) return { error: MAIL_NOT_SET_UP };

  const origin = deskPublicOrigin(env, deps.publicOrigin ?? deps.requestOrigin);
  if (!origin) {
    return {
      error:
        "CRM_PUBLIC_URL is not set, so a verification link cannot be built. No email was sent and no account was created.",
    };
  }

  const issued = await issueStaffVerifyToken(email, db, deps.now ?? Date.now());
  if ("error" in issued) return issued;

  const verifyUrl = `${origin}/login/verify?token=${encodeURIComponent(issued.raw)}`;
  const send = deps.send ?? sendStaffVerificationEmail;
  const sent = await send({ to: email, verifyUrl }, env);
  if ("error" in sent) {
    await db.staffVerifyToken.delete({ where: { id: issued.id } }).catch(() => undefined);
    return sent;
  }
  return { ok: true, email };
}
