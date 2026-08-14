import Link from "next/link";
import { CsvDealImportForm } from "@/components/csv-deal-import";
import { CsvImportForm } from "@/components/csv-import";
import { PageHeader } from "@/components/ui";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        kicker="Book"
        title="Import customers, meters and deals"
        description="CSV only — not monday.com. Preview the rows, then commit. Existing records are updated; nothing is deleted."
        actions={
          <>
            <a href="/api/export/customers" className="btn btn-ghost">
              Export customers
            </a>
            <a href="/api/export/meters" className="btn btn-ghost">
              Export meters
            </a>
            <a href="/api/export/deals" className="btn btn-ghost">
              Export deals
            </a>
            <a href="/api/import/template" className="btn btn-ghost">
              Meter template
            </a>
            <a href="/api/import/deals-template" className="btn btn-ghost">
              Deals template
            </a>
            <Link href="/customers/new" className="btn btn-primary">
              Add one customer
            </Link>
          </>
        }
      />

      <div className="grid gap-8">
        <div>
          <h2 className="section-title mb-3">Customers and meters</h2>
          <CsvImportForm />
        </div>
        <div id="deals">
          <h2 className="section-title mb-3">Deals</h2>
          <CsvDealImportForm />
        </div>
      </div>
    </div>
  );
}
