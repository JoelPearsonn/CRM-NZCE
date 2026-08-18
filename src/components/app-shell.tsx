import { ShellFrame } from "@/components/shell-frame";
import { prisma } from "@/lib/prisma";
import { hasStaffSessionFromCookies } from "@/lib/staff-session";
import { getWorkingAsId } from "@/lib/working-as";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [agents, currentId, staffSignedIn] = await Promise.all([
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
    getWorkingAsId(),
    hasStaffSessionFromCookies(),
  ]);

  return (
    <ShellFrame agents={agents} currentId={currentId} staffSignedIn={staffSignedIn}>
      {children}
    </ShellFrame>
  );
}
