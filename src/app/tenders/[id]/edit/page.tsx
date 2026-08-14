import Link from "next/link";
import { notFound } from "next/navigation";
import { TenderForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import type { IdPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";

export default async function EditTenderPage({ params }: IdPageProps) {
  const { id } = await params;
  const tender = await prisma.tenderResponse.findUnique({
    where: { id },
    include: { customer: { include: { leads: { orderBy: { updatedAt: "desc" } } } } },
  });
  if (!tender) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker={tender.customer.companyName}
        title={`Edit ${tender.supplier} tender`}
        description="Standing charge, unit rates and status live on the quote — this does not send an email."
        actions={
          <Link href={`/customers/${tender.customerId}#tenders`} className="btn btn-ghost">
            Back to customer
          </Link>
        }
      />
      <TenderForm
        tender={tender}
        customerId={tender.customerId}
        leads={tender.customer.leads}
      />
    </div>
  );
}
