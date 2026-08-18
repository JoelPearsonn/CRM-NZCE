# NZCE brokerage desk

This is the working book for NZCE, a UK energy brokerage.

## How to run

1. Install Node from https://nodejs.org (choose the LTS button).
2. Open a terminal in this folder and run:

```bash
npm install
npm run dev
```

3. Open http://localhost:3000 in your browser.

The first screen is empty on purpose. Add a customer, import a CSV, or click **Load demo**. You do not have to use the demo. You can also load it later with:

```bash
npm run seed
```

Then refresh the browser.

This is a desk for brokers — not monday.com, not Salesforce, and not a generic admin theme. The left-hand menu is Desk, Renewals, Tasks, Customers, Leads, Contracts, Finance, Agents, and How to use. Import is under Customers, not on the menu.

After `npm run build`, `npm run start` serves the same address. To wipe the demo book and start again:

```bash
npm run db:reset
```

To run the desk checks (split math, import, MPAN, objection, one live contract):

```bash
npm test
```

The database is a SQLite file at `prisma/dev.db` (not committed). Connection string:

```
DATABASE_URL="file:./dev.db"
```

## How to import

1. Open **Import CSV** (from Customers, or go to `/import`).
2. Download the **meter template** (or the deals / leads template).
3. Fill company, site, and MPAN or MPRN. For deals or leads, use the same columns as the matching export.
4. Preview the rows. Then import.
5. Existing meters are updated by supply number. Existing deals are updated by customer + supplier + start date. **Nothing is deleted.**

You can also add one customer by hand: **Add customer** → add a meter → give it a site name.

## What is in

- Customers, sites and meters (MPAN, MPRN, EAC, AQ, LOA status, objection)
- Leads on a sales process, with a won or lost reason
- Contracts / deals and a monthly finance screen (due, paid, outstanding, estimated — not a PDF)
- Two agents on a deal split estimated and actual **50/50**
- Renewals (30 / 60 / 90 days and a month diary)
- CSV import and export (round-trip columns)
- Soft-archive a customer (hidden from the default book, recoverable — no hard delete)
- Call notes, plus store a recording or transcript file (no live phone)
- Fill and preview an NZCE Letter of Authority from the customer and meters; send via DocuSign when connected, or download if it is not
- Store a signed LOA copy (status, signed-on, who signed, upload)
- Tasks, activity, and a how-to page in plain English

## What is out

- monday.com, or any other CRM sync
- Gmail send (you can log an email by hand; DocuSign can email an LOA when connected)
- Tender-email generation
- Monthly report PDFs
- Hard delete of live customer data
- Google / Clerk / OAuth staff login (Joel has not picked a provider — the desk uses a local staff password only)

## Staff lock

This desk is for NZCE staff on a private machine. Do **not** put it on a public URL. Do **not** add a Cloudflare tunnel.

Read-only HTML can still render, but exports, imports, recordings, LOA files, search JSON, and every write stay **closed** until a staff session exists.

Set these on the server, never in git:

```
CRM_STAFF_PASSWORD=
CRM_SESSION_SECRET=
DOCUSIGN_WEBHOOK_SECRET=
```

If `CRM_STAFF_PASSWORD` is unset, mutating and download routes stay **401**. Sign in at `/login`. The session cookie is httpOnly, Secure, SameSite=Lax, and lasts 12 hours.

DocuSign Connect must send HMAC (`X-DocuSign-Signature-1`). If `DOCUSIGN_WEBHOOK_SECRET` is missing, the webhook is rejected.

Optional customer-portal demo login (local only — rotate anything that used to live in source, and never commit real values):

```
PORTAL_DEMO_EMAIL=
PORTAL_DEMO_PASSWORD=
PORTAL_DEMO_TOKEN=
```

Do not commit customer names as replacements. Do not commit live database dumps.

## Demo book

If the desk is empty, `npm run seed` loads eight UK businesses, four agents, leads and live contracts. Search `Harbour View` or MPAN `002160013300112233445`. St Anne’s Parish Hall is archived so you can see restore.

## Stack

Next.js, TypeScript, Tailwind CSS, Prisma 6, SQLite.
