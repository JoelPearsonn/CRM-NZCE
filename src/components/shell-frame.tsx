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
  staffSignedIn,
}: {
  children: React.ReactNode;
  agents: Agent[];
  currentId: string | null;
  staffSignedIn: boolean;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/portal") || pathname === "/login") {
    return <>{children}</>;
  }
  if (pathname.includes("/print")) {
    return <div className="min-h-screen bg-paper print-sheet">{children}</div>;
  }

  return (
    <div className="desk-shell">
      <Sidebar />
      <div className="desk-column">
        <header className="desk-header">
          <MobileNav />
          <MasterSearch />
          <WorkingAsPicker agents={agents} currentId={currentId} staffSignedIn={staffSignedIn} />
          <a href="/" className="desk-logo" aria-label="Net Zero Commercial Energy">
            <img src="/brand/logo-lockup-on-dark.png" alt="Net Zero Commercial Energy" />
          </a>
        </header>
        <main className="desk-main">
          <TableLabels>{children}</TableLabels>
        </main>
      </div>
    </div>
  );
}
