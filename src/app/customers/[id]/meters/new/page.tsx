import { notFound } from "next/navigation";
import { MeterForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import type { IdPageProps } from "@/lib/page-props";
import { listDeskAgents } from "@/lib/agents";
import { prisma } from "@/lib/prisma";

export default async function NewMeterPage({ params }: IdPageProps) {
  const { id } = await params;
  const [customer, agents] = await Promise.all([
    prisma.customer.findUnique({ where: { id } }),
    listDeskAgents(),
  ]);
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker={customer.companyName}
        title="Add meter"
        description="Give the site a name and address first. MPAN for electric, MPRN for gas."
      />
      <MeterForm customerId={customer.id} agents={agents} />
    </div>
  );
}
