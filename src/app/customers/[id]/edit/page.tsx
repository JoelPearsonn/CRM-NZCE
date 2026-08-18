import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import type { IdPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";

export default async function EditCustomerPage({ params }: IdPageProps) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader kicker="Edit" title={customer.companyName} description="Update the business and contact details." />
      <CustomerForm customer={customer} />
    </div>
  );
}
