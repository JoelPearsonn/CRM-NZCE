export function agentNames(agents: { name: string }[]) {
  if (agents.length === 0) return "—";
  return agents.map((agent) => agent.name).join(" · ");
}

export function splitLabel(agentCount: number) {
  if (agentCount === 2) return "50/50";
  if (agentCount > 2) return `split ${agentCount} ways`;
  return null;
}

export function agentShare(total: number | null | undefined, agentCount: number) {
  const n = Math.max(1, agentCount);
  return (total ?? 0) / n;
}
