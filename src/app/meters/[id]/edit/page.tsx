import { notFound } from "next/navigation";
import { MeterForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import type { IdPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";

export default async function EditMeterPage({ params }: IdPageProps) {
  const { id } = await params;
  const [meter, agents] = await Promise.all([
    prisma.meter.findUnique({ where: { id }, include: { customer: true } }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!meter) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker={meter.customer.companyName}
        title={meter.siteName ?? "Edit meter"}
        description="Rates, LOA, objection and renewal live on the meter, not the company."
      />
      <MeterForm customerId={meter.customerId} meter={meter} agents={agents} />
    </div>
  );
}
