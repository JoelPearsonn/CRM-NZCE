import Link from "next/link";
import { CsvImportForm } from "@/components/csv-import";
import { PageHeader } from "@/components/ui";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        kicker="Book"
        title="Import customers and meters"
        description="CSV only — not monday.com. Preview the rows, then commit. Existing records are updated by MPAN or MPRN; nothing is deleted."
        actions={
          <>
            <a href="/api/import/template" className="btn btn-ghost">
              Download template
            </a>
            <Link href="/customers/new" className="btn btn-primary">
              Add one customer
            </Link>
          </>
        }
      />
      <CsvImportForm />
    </div>
  );
}
