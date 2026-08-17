import Link from "next/link";
import { notFound } from "next/navigation";
import { GenerateLoaButton, GenerateLoaPanel } from "@/components/generate-loa";
import { AllocateAgents, StageSelect } from "@/components/lead-controls";
import { SendLoaPanel } from "@/components/send-loa";
import { FuelPill, PageHeader, Section, StagePill, TenderStatusPill } from "@/components/ui";
import { isClosedLeadStage, isTenderLeadStage, isWonLeadStage } from "@/lib/constants";
import { isDocusignConfigured } from "@/lib/docusign";
import { ensureLeadBoardStages, resolveLeadBoardStage } from "@/lib/lead-board";
import { formatDate, formatDateTime, gbp } from "@/lib/format";
import type { IdPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";
import { tpiLoaKindFromDeals } from "@/lib/tpi-loa";

export default async function LeadDetailPage({ params }: IdPageProps) {
  const { id } = await params;
  await ensureLeadBoardStages();
  const [lead, agents] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            meters: true,
            loaEnvelopes: { orderBy: { createdAt: "desc" }, take: 1 },
            deals: { select: { tpiPartner: true, updatedAt: true }, orderBy: { updatedAt: "desc" } },
          },
        },
        allocations: { include: { agent: true } },
        deals: true,
        tenderResponses: { orderBy: [{ status: "asc" }, { receivedOn: "desc" }] },
      },
    }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!lead) notFound();
  const boardStage = resolveLeadBoardStage(lead);
  const canAddTender = isTenderLeadStage(boardStage);
  const loaKind = tpiLoaKindFromDeals([...lead.deals, ...lead.customer.deals]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Lead"
        title={lead.title}
        description={`${lead.customer.companyName}${lead.source ? ` · ${lead.source}` : ""}`}
        actions={
          <>
            <GenerateLoaButton
              customerId={lead.customerId}
              leadId={lead.id}
              kind={loaKind}
            />
            <Link href={`/customers/${lead.customerId}#loa`} className="btn btn-ghost">
              Send LOA
            </Link>
            <Link href={`/customers/${lead.customerId}`} className="btn btn-ghost">
              Customer
            </Link>
            <Link href={`/leads/${lead.id}/edit`} className="btn btn-primary">
              Edit lead
            </Link>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <StagePill value={boardStage} />
        <span className="text-xs text-muted">Updated {formatDateTime(lead.updatedAt)}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Move stage">
          <div className="p-4">
            <StageSelect
              leadId={lead.id}
              stage={boardStage}
              outcomeReason={lead.outcomeReason}
            />
            {lead.outcomeReason && isClosedLeadStage(boardStage) ? (
              <p className="mt-2 text-sm">
                {isWonLeadStage(boardStage) ? "Won" : "Lost"}: {lead.outcomeReason}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted">
              Stages live in <code>src/lib/constants.ts</code> if you need to rename the process.
            </p>
          </div>
        </Section>
        <Section title="Allocate agents">
          <div className="p-4">
            <AllocateAgents
              leadId={lead.id}
              agents={agents}
              selectedIds={lead.allocations.map((allocation) => allocation.agentId)}
            />
          </div>
        </Section>
      </div>

      <div className="mt-4">
        <GenerateLoaPanel
          customerId={lead.customerId}
          leadId={lead.id}
          companyName={lead.customer.companyName}
          suggestedKind={loaKind}
        />
      </div>

      <div className="mt-4">
        <SendLoaPanel
          customerId={lead.customerId}
          leadId={lead.id}
          companyName={lead.customer.companyName}
          meterCount={lead.customer.meters.length}
          configured={isDocusignConfigured()}
          latest={lead.customer.loaEnvelopes[0] ?? null}
        />
      </div>

      {lead.notes ? (
        <section className="card mt-4 p-4">
          <h2 className="section-title mb-2">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
        </section>
      ) : null}

      {canAddTender || lead.tenderResponses.length > 0 ? (
        <div className="mt-4">
        <Section
          title={`Tender responses · ${lead.tenderResponses.length}`}
          action={
            canAddTender ? (
              <Link
                href={`/customers/${lead.customerId}?leadId=${lead.id}#tenders`}
                className="btn btn-brass"
              >
                Add response
              </Link>
            ) : null
          }
        >
          {lead.tenderResponses.length === 0 ? (
            <p className="p-4 text-sm text-muted">
              This lead is in {boardStage}. Log supplier quotes on the customer — no email is sent
              from here.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {lead.tenderResponses.map((tender) => (
                <li key={tender.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <Link href={`/tenders/${tender.id}/edit`} className="font-medium">
                      {tender.supplier}
                    </Link>
                    <div className="text-[0.7rem] text-muted">
                      {formatDate(tender.receivedOn)}
                      {tender.unitRates ? ` · ${tender.unitRates}` : ""}
                      {tender.estimatedAnnualCost != null
                        ? ` · ${gbp(tender.estimatedAnnualCost)} est. annual`
                        : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FuelPill value={tender.fuelType} />
                    <TenderStatusPill value={tender.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
        </div>
      ) : null}

      {lead.deals.length > 0 ? (
        <section className="card mt-4 p-4">
          <h2 className="section-title mb-2">Linked contracts</h2>
          <ul className="text-sm">
            {lead.deals.map((deal) => (
              <li key={deal.id}>
                <Link href={`/contracts/${deal.id}`}>{deal.supplier}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
