import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function AgentsPage() {
  const agents = await prisma.agent.findMany({
    include: {
      _count: { select: { leadAllocations: true, dealAllocations: true, meters: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        kicker="Desk"
        title="Agents"
        description="People who can be allocated to leads and named on meters and contracts. Switching Working as needs a staff session."
        actions={
          <Link href="/agents/new" className="btn btn-primary">
            Add agent
          </Link>
        }
      />
      {agents.length === 0 ? (
        <EmptyState
          title="No agents on the desk"
          body="Add sales and ops people so leads can be allocated."
          actionHref="/agents/new"
          actionLabel="Add agent"
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="desk-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Leads</th>
                <th>Meters</th>
                <th>Contracts</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td>
                    <Link href={`/agents/${agent.id}/edit`} className="font-medium">
                      {agent.name}
                    </Link>
                  </td>
                  <td>{agent.email}</td>
                  <td>{agent.role}</td>
                  <td>{agent._count.leadAllocations}</td>
                  <td>{agent._count.meters}</td>
                  <td>{agent._count.dealAllocations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
