import { ShellFrame } from "@/components/shell-frame";
import { prisma } from "@/lib/prisma";
import { getWorkingAsId } from "@/lib/working-as";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [agents, currentId] = await Promise.all([
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
    getWorkingAsId(),
  ]);

  return (
    <ShellFrame agents={agents} currentId={currentId}>
      {children}
    </ShellFrame>
  );
}
