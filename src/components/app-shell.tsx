import { ShellFrame } from "@/components/shell-frame";
import { listDeskAgents } from "@/lib/agents";
import { getSignedInStaff, staffIsAdmin } from "@/lib/staff-session";
import { getWorkingAsId } from "@/lib/working-as";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [agents, currentId, staff] = await Promise.all([
    listDeskAgents(),
    getWorkingAsId(),
    getSignedInStaff(),
  ]);
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
