import { notFound } from "next/navigation";
import { MeterForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import type { IdPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";

export default async function NewMeterPage({ params }: IdPageProps) {
  const { id } = await params;
  const [customer, agents] = await Promise.all([
    prisma.customer.findUnique({ where: { id } }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker={customer.companyName}
        title="Add meter"
        description="MPAN for electric, MPRN for gas. Dual-fuel sites can hold both."
      />
      <MeterForm customerId={customer.id} agents={agents} />
    </div>
  );
}
