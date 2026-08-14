import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Desk guide"
        title="How to use this desk"
        description="Plain English for the NZCE book. Nothing here sends email, makes a PDF, or talks to monday.com."
      />

      <div className="grid gap-5">
        <Guide
          title="Add a customer"
          body="Start with the company and a named contact. You need an email or a phone. After save, add a meter and give it a site name — that is where the MPAN or MPRN lives. Multi-site customers get one site heading per building."
        >
          <Link href="/customers/new" className="btn btn-primary">
            Add customer
          </Link>
        </Guide>

        <Guide
          title="Import a list"
          body="If you already have a spreadsheet, download the NZCE template, fill company + site + MPAN or MPRN, then preview before you import. Existing meters are updated by supply number. Nothing is deleted."
        >
          <Link href="/import" className="btn btn-ghost">
            Import CSV
          </Link>
          <a href="/api/import/template" className="btn btn-ghost">
            Download template
          </a>
        </Guide>

        <Guide
          title="Mark an objection"
          body="Open the customer, find the meter, and set objection to In objection. Put a short note (debt, contract, change of tenancy). It shows on the desk and on renewals so the switch is not chased blind."
        >
          <Link href="/customers" className="btn btn-ghost">
            Open customers
          </Link>
        </Guide>

        <Guide
          title="Record a deal"
          body="When a lead is sold, record the contract on the customer (or on Contracts). Same row appears in finance. Two agents on a deal split estimated and actual 50/50. A meter can only have one live contract."
        >
          <Link href="/contracts/new" className="btn btn-ghost">
            Record deal
          </Link>
        </Guide>

        <Guide
          title="Renewals and follow-ups"
          body="Renewals shows 30 / 60 / 90 days. The desk also opens a renewal task when a site is inside 90 days, if one is not already there. The tasks inbox is every chase across the book."
        >
          <Link href="/renewals" className="btn btn-ghost">
            Renewals
          </Link>
          <Link href="/tasks" className="btn btn-ghost">
            Tasks inbox
          </Link>
        </Guide>

        <Guide
          title="Archive, do not delete"
          body="If a customer should leave the default book, archive them. They disappear from lists and search, but the record stays. Restore puts them back. There is no delete button on live data."
        >
          <Link href="/customers?archived=1" className="btn btn-ghost">
            View archived
          </Link>
        </Guide>
      </div>
    </div>
  );
}

function Guide({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <h2 className="section-title">{title}</h2>
      <p className="mt-2 text-sm text-muted">{body}</p>
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </section>
  );
}
