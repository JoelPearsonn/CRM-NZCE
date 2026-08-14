import { MasterSearch } from "@/components/master-search";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-rule bg-paper-2 px-6 py-3">
          <MasterSearch />
          <div className="hidden text-right sm:block">
            <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted uppercase">
              Working book
            </p>
            <p className="text-sm text-ink">No login in this cut</p>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
