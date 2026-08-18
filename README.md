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
- Google / Clerk / OAuth staff login (each desk person uses their own local password)

## Staff lock

This desk is for NZCE staff on a private machine. Do **not** put it on a public URL. Do **not** add a Cloudflare tunnel.

Read-only HTML can still render, but exports, imports, recordings, LOA files, search JSON, and every write stay **closed** until that person has a password and signs in at `/login`.

There is **no shared desk password**. Login is that person’s **@nzcenergy.co.uk work email** plus their own password. Name / username login is closed. Non-work emails (including seed `@nzce.co.uk` rows) cannot sign in. If that work email has no password hash, sign-in fails closed.

Do not invent other people’s addresses. Any `@nzcenergy.co.uk` Agent can sign in once a hash exists for that exact email. The first/admin account is Joel’s email: `joel.pearson@nzcenergy.co.uk`.

### Joel’s first password (never in git)

1. On the machine (not committed):

```bash
npm run staff-hash -- "Joel’s local password"
```

The command prints a `salt:hash`. The password itself stays on that machine.

2. Put **only the hash** in **`.env.local`** (gitignored) or the host env. Do **not** put it in the committed `.env` (that file is only the SQLite URL):

```
CRM_SESSION_SECRET=a-long-random-string
CRM_STAFF_PASSWORDS=joel.pearson@nzcenergy.co.uk=SALT:HASH
DOCUSIGN_WEBHOOK_SECRET=
```

3. Sign in at `/login` with `joel.pearson@nzcenergy.co.uk` and that password.

4. After Joel is signed in, he can set a password on **Agents** for any row that already has a real `@nzcenergy.co.uk` address. That stores a hash on the Agent row. It never goes in git. Do not invent addresses for seed demo agents.

The session cookie is httpOnly, Secure, SameSite=Lax, lasts 12 hours, and is bound to that work email. Working as can only switch to yourself, unless you are Admin.

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
