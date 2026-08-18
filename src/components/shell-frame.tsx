"use client";

import { usePathname } from "next/navigation";
import { MasterSearch } from "@/components/master-search";
import { MobileNav, Sidebar } from "@/components/sidebar";
import { TableLabels } from "@/components/table-labels";
import { WorkingAsPicker } from "@/components/working-as";
import type { PublicAgent } from "@/lib/staff-auth";

export function ShellFrame({
  children,
  agents,
  currentId,
  staffSignedIn,
  staffName,
}: {
  children: React.ReactNode;
  agents: PublicAgent[];
  currentId: string | null;
  staffSignedIn: boolean;
  staffName: string | null;
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
          <WorkingAsPicker
            agents={agents}
            currentId={currentId}
            staffSignedIn={staffSignedIn}
            staffName={staffName}
          />
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
