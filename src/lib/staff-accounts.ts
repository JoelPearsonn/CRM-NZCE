import { verifyPassword } from "@/lib/portal-crypto";
import { prisma } from "@/lib/prisma";
import { staffPasswordHashFor } from "@/lib/staff-auth";

type StaffEnv = Record<string, string | undefined>;

export async function findStaffAgent(
  identifier: string,
  db: { agent: { findMany: typeof prisma.agent.findMany } } = prisma,
) {
  const needle = identifier.trim().toLowerCase();
  if (!needle) return null;
  const agents = await db.agent.findMany({
    select: { id: true, name: true, email: true, role: true, passwordHash: true },
  });
  return (
    agents.find((agent) => agent.email.toLowerCase() === needle) ??
    agents.find((agent) => agent.name.toLowerCase() === needle) ??
    agents.find((agent) => agent.email.toLowerCase().split("@")[0] === needle) ??
    null
  );
}

export async function authenticateStaff(
  input: { identifier?: string; password?: string },
  db: { agent: { findMany: typeof prisma.agent.findMany } } = prisma,
  env: StaffEnv = process.env,
) {
  const identifier = input.identifier?.trim() ?? "";
  const password = input.password ?? "";
  const agent = await findStaffAgent(identifier, db);
  if (!agent) return { error: "No staff login for that person." };
  const hash = staffPasswordHashFor(agent.email, agent.passwordHash, env);
  if (!hash) return { error: "Staff sign-in is not set for that person." };
  if (!verifyPassword(password, hash)) return { error: "Email or password is not right." };
  return {
    ok: true as const,
    agent: { id: agent.id, name: agent.name, email: agent.email, role: agent.role },
  };
}
