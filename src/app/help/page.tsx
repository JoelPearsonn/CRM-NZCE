import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Desk guide"
        title="How to use this desk"
        description="Plain English for the NZCE book. Nothing here talks to monday.com. An LOA PDF can be filled on the desk; DocuSign only sends when it is connected."
      />

      <div className="grid gap-5">
        <Guide
          title="The menu"
          body="On a computer the menu sits on the left. On a phone tap the three-line button at the top left. Search the book sits in the header on every page — type a company, contact, MPAN or MPRN and press Enter to open the match (a lead if you are on Leads and one matches, otherwise the customer). Desk is today on the book. Renewals is 30 / 60 / 90 days and the month diary. Tasks is every follow-up. Customers is the book (sites, meters, notes). Leads is the pipeline. Contracts is the sold book. Finance is cashflow and profit. Agents is who you allocate. How to use is this page. Import is not on the menu — open it from Customers."
        >
          <Link href="/" className="btn btn-ghost">
            Desk
          </Link>
          <Link href="/renewals" className="btn btn-ghost">
            Renewals
          </Link>
          <Link href="/tasks" className="btn btn-ghost">
            Tasks
          </Link>
          <Link href="/customers" className="btn btn-ghost">
            Customers
          </Link>
          <Link href="/leads" className="btn btn-ghost">
            Leads
          </Link>
          <Link href="/contracts" className="btn btn-ghost">
            Contracts
          </Link>
          <Link href="/finance" className="btn btn-ghost">
            Finance
          </Link>
          <Link href="/agents" className="btn btn-ghost">
            Agents
          </Link>
        </Guide>

        <Guide
          title="Add a customer"
          body="Start with the company and a named contact. You need an email or a phone. After save, add a meter and give it a site name — that is where the MPAN or MPRN lives. Multi-site customers get one site heading per building. If the company or email is already on the book, the desk warns you and links the existing record. You can still add a second customer if you confirm."
        >
          <Link href="/customers/new" className="btn btn-primary">
            Add customer
          </Link>
        </Guide>

        <Guide
          title="Import a list"
          body="If you already have a spreadsheet, download the NZCE template, fill company + site + MPAN or MPRN, then preview before you import. Existing meters are updated by supply number. Deals and leads have their own templates — same columns as the export buttons. Deal import stores Payment 1 / 2 / 3 and expected dates when those columns are present; otherwise it splits full deal value (already net of TPI) by the percents, keeping zeros in place. Monthly residual is only for older residual deals. Nothing is deleted."
        >
          <Link href="/import" className="btn btn-ghost">
            Import CSV
          </Link>
          <a href="/api/import/template" className="btn btn-ghost">
            Meter template
          </a>
          <a href="/api/import/deals-template" className="btn btn-ghost">
            Deals template
          </a>
          <a href="/api/import/leads-template" className="btn btn-ghost">
            Leads template
          </a>
        </Guide>

        <Guide
          title="Export the book"
          body="Customers, meters, deals and leads each have a download button. The columns match the import templates so a round-trip works — including meter dates, rates and objection. If you have a filter on (renewing 30 days, in objection, my book), Export this view downloads only what you can see."
        >
          <Link href="/customers" className="btn btn-ghost">
            Customers
          </Link>
          <Link href="/leads" className="btn btn-ghost">
            Leads
          </Link>
        </Guide>

        <Guide
          title="Send an LOA"
          body="Open the customer and use Generate LOA or the Letters of Authority panel. LOA copies live on the customer — upload one, save, then upload another and both stay stored. Older per-meter files still show on that list. Preview or open a file in a new tab so the customer record stays open. Send LOA still fills every MPAN/MPRN. If DocuSign is not connected you download the PDF and supplies are marked requested."
        >
          <Link href="/customers" className="btn btn-ghost">
            Open customers
          </Link>
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
          title="First run"
          body="If the book is empty you get a start screen: add a customer, import a CSV, or load the demo. The demo is optional."
        >
          <Link href="/" className="btn btn-ghost">
            Desk
          </Link>
          <Link href="/customers/new" className="btn btn-ghost">
            Add customer
          </Link>
          <Link href="/import" className="btn btn-ghost">
            Import CSV
          </Link>
        </Guide>

        <Guide
          title="Record a deal"
          body="When a lead is sold, record the contract on the customer (or on Contracts). Put CSD and CED — length is taken from those dates. Full deal value is already net of TPI; pick the TPI partner (including TUS) so it is stored on the deal. Sold-deal finance is three split legs (On Sign / On Live / EOC) each with an amount and expected date — zeros stay, so 0/80/20 is On Live + EOC. Actual commission is one received pair for the whole deal. Monthly residual stays only on older residual deals. Two agents on a deal still split 50/50. A meter can only have one live contract."
        >
          <Link href="/contracts/new" className="btn btn-ghost">
            Record deal
          </Link>
        </Guide>

        <Guide
          title="Monthly finance"
          body="Finance opens on this month. Due is by each Payment 1 / 2 / 3 expected date. Actual commission is one received amount on the actual payment date — not per leg. It is a screen, not a PDF."
        >
          <Link href="/finance" className="btn btn-ghost">
            This month
          </Link>
          <Link href="/finance?month=all" className="btn btn-ghost">
            All months
          </Link>
        </Guide>

        <Guide
          title="Won or lost reason"
          body="Moving a lead to Won or Lost needs a reason. Tap a common one (best price, stayed with incumbent) or type your own. Each card shows company, contact, phone, email, LOA sent/received and the owner. Allocate stays in the dropdown. The column number is how many cards sit in that group."
        >
          <Link href="/leads" className="btn btn-ghost">
            Open leads
          </Link>
        </Guide>

        <Guide
          title="Log a call"
          body="On the customer record, mark Phone, Visit or Note, write what was said, and save. You can also store a call recording or a text transcript with a short note. The desk does not dial or record a live line. Last contact shows on the customer list so you can see who has gone quiet."
        >
          <Link href="/customers" className="btn btn-ghost">
            Customers
          </Link>
        </Guide>

        <Guide
          title="Renewals and follow-ups"
          body="Renewals shows 30 / 60 / 90 days. Month diary is the same book on a wall calendar. The desk also opens a renewal task when a site is inside 90 days, if one is not already there. The tasks inbox is every chase across the book. When you are working as Joel (Admin), a quarterly reminder sits on the Desk and in Tasks to send a market update to all customers — mark it done and it rolls to the next quarter. Nothing is emailed."
        >
          <Link href="/renewals" className="btn btn-ghost">
            Renewals
          </Link>
          <Link href="/renewals/calendar" className="btn btn-ghost">
            Month diary
          </Link>
          <Link href="/tasks" className="btn btn-ghost">
            Tasks inbox
          </Link>
        </Guide>

        <Guide
          title="Same MPAN twice"
          body="The desk will not create a second meter with the same MPAN or MPRN. If you type a supply number that is already on the book, you get a warning and a link to the existing customer. Change the number if this is a different site."
        >
          <Link href="/customers" className="btn btn-ghost">
            Open customers
          </Link>
        </Guide>

        <Guide
          title="Customer portal"
          body="Customers can sign in at /portal to see only their own contracts, meters and renewal dates. The portal never shows TPI, commission or broker payouts. Wilf’s public site can attach to /api/portal (session, me, contracts, meters, renewals). The staff desk is unchanged."
        >
          <Link href="/portal/login" className="btn btn-ghost">
            Preview portal
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
