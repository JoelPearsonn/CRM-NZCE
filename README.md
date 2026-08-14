# NZCE brokerage desk

Purpose-built CRM for **NZCE**, a UK energy brokerage. It is a working book for customers, meters, leads and sold contracts — not a generic admin theme and not a Twenty / monday.com / Salesforce shell.

This cut is the first working version: sales and ops can keep the book, move leads, and see renewals and commission. It does **not** generate LOAs, send tender emails, talk to DocuSign or Gmail, store call recordings, or build monthly report PDFs.

## What is in this cut

- **Customers** with business/contact details and multiple meters
- **Meters** with MPAN / MPRN, Electric EAC / Gas AQ, supplier, contract dates, meter type, HH/NHH, current rates, renewal date, LOA status (field only), salesperson
- **Leads** on a sales process, allocated to one or more agents
- **Contracts / deals** when sold, with renewal visibility and finance fields: due date, amount due, estimated commission, actual paid
- **Master search** in the header (name, MPAN, MPRN, email, company)
- Customer desk: call notes, email log (manual, not live Gmail), tasks/follow-ups, activity history
- Dashboard: renewals in the next 90 days, open leads by stage, commission due vs paid
- Agents list for allocation (no real auth)

Lead stages (edit `src/lib/constants.ts` to change them):

`New → Contacted → LOA requested → Tendering → Quoted → Sold → Lost`

## What is out

- LOA document generation
- Tender email send
- DocuSign
- Call recordings / transcripts
- Monthly report PDFs
- Gmail, monday.com, or other CRM integrations
- Real login / permissions (stub only: “no login in this cut”)

## How to run

Needs Node 20+.

```bash
npm install
npm run dev
```

That generates the Prisma client, creates the local SQLite database, seeds demo data if the desk is empty, and starts the app at [http://localhost:3000](http://localhost:3000).

To wipe and reseed:

```bash
npm run db:reset
```

SQLite file: `prisma/dev.db` (gitignored). Connection string is in `.env` / `.env.example`:

```
DATABASE_URL="file:./dev.db"
```

## Demo book

Seed loads eight UK businesses (mix of single- and multi-meter, electric and gas), four desk agents, mid-pipeline leads, and live contracts with commission figures. Try searching an MPAN such as `008010011234567890123` or a company such as `Harbour View`.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, Prisma, SQLite.
