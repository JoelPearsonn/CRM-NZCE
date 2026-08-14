"use client";

import { usePathname } from "next/navigation";
import type { Agent } from "@prisma/client";
import { MasterSearch } from "@/components/master-search";
import { MobileNav, Sidebar } from "@/components/sidebar";
import { TableLabels } from "@/components/table-labels";
import { WorkingAsPicker } from "@/components/working-as";

export function ShellFrame({
  children,
  agents,
  currentId,
}: {
  children: React.ReactNode;
  agents: Agent[];
  currentId: string | null;
}) {
  const pathname = usePathname();
  if (pathname.includes("/print")) {
    return <div className="min-h-screen bg-paper print-sheet">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="desk-header">
          <MobileNav />
          <MasterSearch />
          <WorkingAsPicker agents={agents} currentId={currentId} />
        </header>
        <main className="desk-main">
          <TableLabels>{children}</TableLabels>
        </main>
      </div>
    </div>
  );
}
