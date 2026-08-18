import Link from "next/link";
import { SetStaffPasswordForm } from "@/components/set-staff-password";
import { EmptyState, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { staffHasPassword } from "@/lib/staff-auth";
import { getSignedInStaff, staffIsAdmin } from "@/lib/staff-session";

export default async function AgentsPage() {
  const [agents, staff] = await Promise.all([
    prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
        _count: { select: { leadAllocations: true, dealAllocations: true, meters: true } },
      },
      orderBy: { name: "asc" },
    }),
    getSignedInStaff(),
  ]);
  const admin = staffIsAdmin(staff);

  return (
    <div>
      <PageHeader
        kicker="Desk"
        title="Agents"
        description="People who can be allocated to leads and named on meters and contracts. Each person signs in with their own password."
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
                <th>Login</th>
                <th>Leads</th>
                <th>Meters</th>
                <th>Contracts</th>
                {admin ? <th>Set password</th> : null}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const { passwordHash, ...safe } = agent;
                return (
                  <tr key={safe.id}>
                    <td>
                      <Link href={`/agents/${safe.id}/edit`} className="font-medium">
                        {safe.name}
                      </Link>
                    </td>
                    <td>{safe.email}</td>
                    <td>{safe.role}</td>
                    <td>{staffHasPassword(safe.email, passwordHash) ? "Set" : "Not set"}</td>
                    <td>{safe._count.leadAllocations}</td>
                    <td>{safe._count.meters}</td>
                    <td>{safe._count.dealAllocations}</td>
                    {admin ? (
                      <td>
                        <SetStaffPasswordForm agentId={safe.id} agentName={safe.name} />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
