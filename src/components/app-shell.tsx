import { MasterSearch } from "@/components/master-search";
import { Sidebar } from "@/components/sidebar";
import { WorkingAsPicker } from "@/components/working-as";
import { prisma } from "@/lib/prisma";
import { getWorkingAsId } from "@/lib/working-as";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [agents, currentId] = await Promise.all([
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
    getWorkingAsId(),
  ]);

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-rule bg-paper-2 px-6 py-3">
          <MasterSearch />
          <WorkingAsPicker agents={agents} currentId={currentId} />
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
