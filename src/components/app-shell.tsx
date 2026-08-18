import { ShellFrame } from "@/components/shell-frame";
import { listDeskAgents } from "@/lib/agents";
import { isDeskDatabaseConfigured } from "@/lib/desk-database";
import { getSignedInStaff, staffIsAdmin } from "@/lib/staff-session";
import { getWorkingAsId } from "@/lib/working-as";

export async function AppShell({ children }: { children: React.ReactNode }) {
  if (!isDeskDatabaseConfigured()) {
    return <>{children}</>;
  }

  let agents: Awaited<ReturnType<typeof listDeskAgents>> = [];
  let currentId: string | null = null;
  let staff: Awaited<ReturnType<typeof getSignedInStaff>> = null;
  try {
    [agents, currentId, staff] = await Promise.all([
      listDeskAgents(),
      getWorkingAsId(),
      getSignedInStaff(),
    ]);
  } catch {
    return <>{children}</>;
  }
  const allowedAgents = staffIsAdmin(staff)
    ? agents
    : agents.filter((agent) => agent.id === staff?.id);
  const workingAsId =
    currentId && allowedAgents.some((agent) => agent.id === currentId)
      ? currentId
      : staff?.id ?? null;

  return (
    <ShellFrame
      agents={allowedAgents}
      currentId={workingAsId}
      staffSignedIn={Boolean(staff)}
      staffName={staff?.name ?? null}
    >
      {children}
    </ShellFrame>
  );
}
