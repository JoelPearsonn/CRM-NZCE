"use client";

import { usePathname } from "next/navigation";
import type { Agent } from "@prisma/client";
import { MasterSearch } from "@/components/master-search";
import { Sidebar } from "@/components/sidebar";
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
        <header className="flex items-center justify-between gap-4 border-b border-rule bg-paper-2 px-6 py-3">
          <MasterSearch />
          <WorkingAsPicker agents={agents} currentId={currentId} />
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
