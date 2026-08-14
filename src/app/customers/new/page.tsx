import Link from "next/link";
import { CustomerForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="New record"
        title="Add customer"
        description="Company name is required, plus a named contact and at least an email or a phone. After save, add a meter with a site name and address. Or import a CSV if you already have a list."
        actions={
          <Link href="/import" className="btn btn-ghost">
            Import CSV instead
          </Link>
        }
      />
      <CustomerForm />
      <p className="mt-4 text-sm text-muted">
        Next: add a meter on the customer so renewals, LOA and tenders have a site to sit on.{" "}
        <a href="/api/import/template" className="font-semibold text-brass-dark">
          Download the import template
        </a>
        .
      </p>
    </div>
  );
}
