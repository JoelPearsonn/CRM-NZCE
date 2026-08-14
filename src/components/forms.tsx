"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Agent, Customer, Deal, Lead, Meter, TenderResponse } from "@prisma/client";
import { saveAgent, type ActionState as AgentState } from "@/app/actions/agents";
import { saveCustomer, type ActionState as CustomerState } from "@/app/actions/customers";
import { saveDeal, type ActionState as DealState } from "@/app/actions/deals";
import { saveLead, type ActionState as LeadState } from "@/app/actions/leads";
import { saveMeter, type ActionState as MeterState } from "@/app/actions/meters";
import { saveTenderResponse, type ActionState as TenderState } from "@/app/actions/tenders";
import { ErrorBanner, Field } from "@/components/ui";
import {
  AGENT_ROLES,
  DEAL_STATUSES,
  FUEL_TYPES,
  LEAD_STAGES,
  LOA_STATUSES,
  METER_TYPES,
  OBJECTION_STATUSES,
  SETTLEMENT_TYPES,
  TENDER_STATUSES,
  UK_SUPPLIERS,
} from "@/lib/constants";
import { toDateInput } from "@/lib/format";

const empty: CustomerState = {};

export function CustomerForm({ customer }: { customer?: Customer }) {
  const [state, action, pending] = useActionState(saveCustomer, empty);
  return (
    <form action={action} className="card grid gap-4 p-5 md:grid-cols-2">
      {customer ? <input type="hidden" name="id" value={customer.id} /> : null}
      <div className="md:col-span-2">
        <ErrorBanner message={state.error} />
        {state.duplicate ? (
          <div className="border border-warn/40 bg-warn-soft px-3 py-3 text-sm">
            <p className="font-medium text-ink">
              This {state.duplicate.match === "email" ? "email" : "company name"} is already on the
              book.
            </p>
            <p className="mt-1 text-muted">
              {state.duplicate.companyName}
              {state.duplicate.email ? ` · ${state.duplicate.email}` : ""}
            </p>
            <p className="mt-2">
              <Link href={`/customers/${state.duplicate.id}`} className="font-semibold text-brass-dark">
                Open the existing record
              </Link>
              {" — "}or add this as a second record if you are sure.
            </p>
            <input type="hidden" name="confirmDuplicate" value="1" />
          </div>
        ) : null}
      </div>
      <Field label="Company name" name="companyName">
        <input id="companyName" name="companyName" required defaultValue={customer?.companyName} />
      </Field>
      <Field label="Trading as" name="tradingName">
        <input id="tradingName" name="tradingName" defaultValue={customer?.tradingName ?? ""} />
      </Field>
      <Field label="Contact name" name="contactName">
        <input id="contactName" name="contactName" required defaultValue={customer?.contactName} />
      </Field>
      <Field label="Email" name="email" hint="Email or phone — at least one is required.">
        <input id="email" name="email" type="email" defaultValue={customer?.email} />
      </Field>
      <Field label="Phone" name="phone">
        <input id="phone" name="phone" defaultValue={customer?.phone ?? ""} />
      </Field>
      <Field label="Industry" name="industry">
        <input id="industry" name="industry" defaultValue={customer?.industry ?? ""} />
      </Field>
      <Field label="Address" name="addressLine1">
        <input id="addressLine1" name="addressLine1" defaultValue={customer?.addressLine1 ?? ""} />
      </Field>
      <Field label="City" name="city">
        <input id="city" name="city" defaultValue={customer?.city ?? ""} />
      </Field>
      <Field label="Postcode" name="postcode">
        <input id="postcode" name="postcode" defaultValue={customer?.postcode ?? ""} />
      </Field>
      <div className="md:col-span-2 flex justify-end">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : customer ? "Save customer" : state.duplicate ? "Add anyway" : "Add customer"}
        </button>
      </div>
    </form>
  );
}

export function MeterForm({
  customerId,
  meter,
  agents,
}: {
  customerId: string;
  meter?: Meter;
  agents: Agent[];
}) {
  const [state, action, pending] = useActionState(saveMeter, empty as MeterState);
  return (
    <form action={action} encType="multipart/form-data" className="card grid gap-4 p-5 md:grid-cols-2">
      {meter ? <input type="hidden" name="id" value={meter.id} /> : null}
      <input type="hidden" name="customerId" value={customerId} />
      <div className="md:col-span-2">
        <ErrorBanner message={state.error} />
      </div>
      <Field label="Site name" name="siteName" hint="The building or trading site — first-class, not just a note.">
        <input id="siteName" name="siteName" required defaultValue={meter?.siteName ?? ""} />
      </Field>
      <Field label="Site address" name="siteAddress">
        <input id="siteAddress" name="siteAddress" defaultValue={meter?.siteAddress ?? ""} />
      </Field>
      <Field label="Fuel" name="fuelType">
        <select id="fuelType" name="fuelType" required defaultValue={meter?.fuelType ?? "ELECTRIC"}>
          {FUEL_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="MPAN" name="mpan" hint="Electric supply number">
        <input id="mpan" name="mpan" className="meter-id" defaultValue={meter?.mpan ?? ""} />
      </Field>
      <Field label="MPRN" name="mprn" hint="Gas supply number">
        <input id="mprn" name="mprn" className="meter-id" defaultValue={meter?.mprn ?? ""} />
      </Field>
      <Field label="Electric EAC (kWh)" name="electricEac">
        <input id="electricEac" name="electricEac" defaultValue={meter?.electricEac ?? ""} />
      </Field>
      <Field label="Gas AQ (kWh)" name="gasAq">
        <input id="gasAq" name="gasAq" defaultValue={meter?.gasAq ?? ""} />
      </Field>
      <Field label="Supplier" name="supplier">
        <input id="supplier" name="supplier" list="suppliers" defaultValue={meter?.supplier ?? ""} />
        <datalist id="suppliers">
          {UK_SUPPLIERS.map((supplier) => (
            <option key={supplier} value={supplier} />
          ))}
        </datalist>
      </Field>
      <Field label="Meter type" name="meterType">
        <input id="meterType" name="meterType" list="meter-types" defaultValue={meter?.meterType ?? ""} />
        <datalist id="meter-types">
          {METER_TYPES.map((type) => (
            <option key={type} value={type} />
          ))}
        </datalist>
      </Field>
      <Field label="HH / NHH" name="settlement">
        <select id="settlement" name="settlement" defaultValue={meter?.settlement ?? ""}>
          <option value="">Not set</option>
          {SETTLEMENT_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="LOA status" name="loaStatus">
        <select id="loaStatus" name="loaStatus" defaultValue={meter?.loaStatus ?? "NOT_REQUESTED"}>
          {LOA_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="LOA signed on" name="loaSignedOn">
        <input
          id="loaSignedOn"
          name="loaSignedOn"
          type="date"
          defaultValue={toDateInput(meter?.loaSignedOn)}
        />
      </Field>
      <Field label="Who signed" name="loaSignedBy" hint="Name on the LOA — usually the customer contact.">
        <input id="loaSignedBy" name="loaSignedBy" defaultValue={meter?.loaSignedBy ?? ""} />
      </Field>
      <div className="md:col-span-2">
        <Field
          label="Signed LOA copy"
          name="loaFile"
          hint="Store the signed file here. This does not generate an LOA or send it to DocuSign."
        >
          <input id="loaFile" name="loaFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt" />
          {meter?.loaFileName ? (
            <p className="text-xs text-muted">
              On file:{" "}
              <a href={`/api/loa/${meter.id}`} className="font-medium text-brass-dark">
                {meter.loaFileName}
              </a>
            </p>
          ) : null}
        </Field>
      </div>
      <Field label="Objection" name="objectionStatus">
        <select
          id="objectionStatus"
          name="objectionStatus"
          defaultValue={meter?.objectionStatus ?? "NONE"}
        >
          {OBJECTION_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Objection raised" name="objectionRaisedOn">
        <input
          id="objectionRaisedOn"
          name="objectionRaisedOn"
          type="date"
          defaultValue={toDateInput(meter?.objectionRaisedOn)}
        />
      </Field>
      <Field label="Objection cleared" name="objectionClearedOn">
        <input
          id="objectionClearedOn"
          name="objectionClearedOn"
          type="date"
          defaultValue={toDateInput(meter?.objectionClearedOn)}
        />
      </Field>
      <div className="md:col-span-2">
        <Field
          label="Objection reason"
          name="objectionNote"
          hint="Debt, contracted, errant, date raised — whatever the current supplier cited."
        >
          <textarea
            id="objectionNote"
            name="objectionNote"
            rows={2}
            defaultValue={meter?.objectionNote ?? ""}
          />
        </Field>
      </div>
      <Field label="Contract start" name="contractStart">
        <input id="contractStart" name="contractStart" type="date" defaultValue={toDateInput(meter?.contractStart)} />
      </Field>
      <Field label="Contract end" name="contractEnd">
        <input id="contractEnd" name="contractEnd" type="date" defaultValue={toDateInput(meter?.contractEnd)} />
      </Field>
      <Field label="Renewal date" name="renewalDate">
        <input id="renewalDate" name="renewalDate" type="date" defaultValue={toDateInput(meter?.renewalDate)} />
      </Field>
      <Field label="Salesperson" name="salespersonId">
        <select id="salespersonId" name="salespersonId" defaultValue={meter?.salespersonId ?? ""}>
          <option value="">Unassigned</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="md:col-span-2">
        <Field label="Current rates" name="currentRates">
          <textarea id="currentRates" name="currentRates" rows={2} defaultValue={meter?.currentRates ?? ""} />
        </Field>
      </div>
      <div className="md:col-span-2 flex justify-end">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : meter ? "Save meter" : "Add meter"}
        </button>
      </div>
    </form>
  );
}

export function LeadForm({
  lead,
  customers,
  agents,
  selectedAgentIds = [],
  presetCustomerId,
}: {
  lead?: Lead;
  customers: Customer[];
  agents: Agent[];
  selectedAgentIds?: string[];
  presetCustomerId?: string;
}) {
  const [state, action, pending] = useActionState(saveLead, empty as LeadState);
  const [stage, setStage] = useState(lead?.stage ?? "NEW");
  const needsReason = stage === "SOLD" || stage === "LOST";
  return (
    <form action={action} className="card grid gap-4 p-5 md:grid-cols-2">
      {lead ? <input type="hidden" name="id" value={lead.id} /> : null}
      <div className="md:col-span-2">
        <ErrorBanner message={state.error} />
      </div>
      <Field label="Customer" name="customerId">
        <select
          id="customerId"
          name="customerId"
          required
          defaultValue={lead?.customerId ?? presetCustomerId ?? ""}
        >
          <option value="">Select customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.companyName}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Stage" name="stage">
        <select
          id="stage"
          name="stage"
          value={stage}
          onChange={(event) => setStage(event.target.value)}
        >
          {LEAD_STAGES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      {needsReason ? (
        <Field
          label={stage === "SOLD" ? "Won reason" : "Lost reason"}
          name="outcomeReason"
          hint="Required when a lead is sold or lost."
        >
          <input
            id="outcomeReason"
            name="outcomeReason"
            required
            defaultValue={lead?.outcomeReason ?? ""}
          />
        </Field>
      ) : null}
      <div className="md:col-span-2">
        <Field label="Title" name="title">
          <input id="title" name="title" required defaultValue={lead?.title} />
        </Field>
      </div>
      <Field label="Source" name="source">
        <input id="source" name="source" defaultValue={lead?.source ?? ""} />
      </Field>
      <div className="field">
        <span className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
          Allocate agents
        </span>
        <div className="grid gap-2 rounded-sm border border-rule bg-card p-3">
          {agents.length === 0 ? (
            <p className="text-sm text-muted">Add agents first so this lead can be allocated.</p>
          ) : (
            agents.map((agent) => (
              <label key={agent.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="agentIds"
                  value={agent.id}
                  defaultChecked={selectedAgentIds.includes(agent.id)}
                />
                {agent.name}
                <span className="text-muted">· {agent.role}</span>
              </label>
            ))
          )}
        </div>
      </div>
      <div className="md:col-span-2">
        <Field label="Notes" name="notes">
          <textarea id="notes" name="notes" rows={3} defaultValue={lead?.notes ?? ""} />
        </Field>
      </div>
      <div className="md:col-span-2 flex justify-end">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : lead ? "Save lead" : "Open lead"}
        </button>
      </div>
    </form>
  );
}

export function DealForm({
  deal,
  customers,
  meters,
  leads,
  agents,
  presetCustomerId,
  returnTo,
  lockCustomer,
  embedded,
  selectedAgentIds = [],
}: {
  deal?: Deal;
  customers: Customer[];
  meters: Meter[];
  leads: Lead[];
  agents: Agent[];
  presetCustomerId?: string;
  returnTo?: "customer" | "contract";
  lockCustomer?: boolean;
  embedded?: boolean;
  selectedAgentIds?: string[];
}) {
  const [state, action, pending] = useActionState(saveDeal, empty as DealState);
  const customerId = deal?.customerId ?? presetCustomerId ?? "";
  return (
    <form
      action={action}
      className={embedded ? "grid gap-4 p-4 md:grid-cols-2" : "card grid gap-4 p-5 md:grid-cols-2"}
    >
      {deal ? <input type="hidden" name="id" value={deal.id} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <div className="md:col-span-2">
        <ErrorBanner message={state.error} />
      </div>
      {lockCustomer ? (
        <input type="hidden" name="customerId" value={customerId} />
      ) : (
        <Field label="Customer" name="customerId">
          <select id="customerId" name="customerId" required defaultValue={customerId}>
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.companyName}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Supplier" name="supplier">
        <input id="supplier" name="supplier" list="suppliers" required defaultValue={deal?.supplier} />
        <datalist id="suppliers">
          {UK_SUPPLIERS.map((supplier) => (
            <option key={supplier} value={supplier} />
          ))}
        </datalist>
      </Field>
      <Field label="Fuel" name="fuelType">
        <select id="fuelType" name="fuelType" required defaultValue={deal?.fuelType ?? "ELECTRIC"}>
          {FUEL_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Status" name="status">
        <select id="status" name="status" defaultValue={deal?.status ?? "LIVE"}>
          {DEAL_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Meter"
        name="meterId"
        hint="A meter (MPAN/MPRN) can only have one live contract."
      >
        <select id="meterId" name="meterId" defaultValue={deal?.meterId ?? ""}>
          <option value="">Not linked</option>
          {meters.map((meter) => (
            <option key={meter.id} value={meter.id}>
              {[meter.siteName, meter.mpan || meter.mprn, meter.fuelType].filter(Boolean).join(" · ")}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Lead" name="leadId">
        <select id="leadId" name="leadId" defaultValue={deal?.leadId ?? ""}>
          <option value="">Not linked</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.title}
            </option>
          ))}
        </select>
      </Field>
      <div className="field">
        <span className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
          Sales agents
        </span>
        <p className="text-xs text-muted">Two agents split estimated and actual 50/50 in finance.</p>
        <div className="mt-1 grid gap-2 rounded-sm border border-rule bg-card p-3">
          {agents.map((agent) => (
            <label key={agent.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="agentIds"
                value={agent.id}
                defaultChecked={
                  selectedAgentIds.includes(agent.id) ||
                  (!selectedAgentIds.length && deal?.salespersonId === agent.id)
                }
              />
              {agent.name}
              <span className="text-muted">· {agent.role}</span>
            </label>
          ))}
        </div>
      </div>
      <Field label="Contract start" name="contractStart">
        <input id="contractStart" name="contractStart" type="date" defaultValue={toDateInput(deal?.contractStart)} />
      </Field>
      <Field label="Contract end" name="contractEnd">
        <input id="contractEnd" name="contractEnd" type="date" defaultValue={toDateInput(deal?.contractEnd)} />
      </Field>
      <Field label="Renewal date" name="renewalDate">
        <input id="renewalDate" name="renewalDate" type="date" defaultValue={toDateInput(deal?.renewalDate)} />
      </Field>
      <Field label="Commission due date" name="dueDate">
        <input id="dueDate" name="dueDate" type="date" defaultValue={toDateInput(deal?.dueDate)} />
      </Field>
      <Field label="Amount due (£)" name="amountDue">
        <input id="amountDue" name="amountDue" defaultValue={deal?.amountDue ?? ""} />
      </Field>
      <Field label="Estimated commission (£)" name="estimatedCommission">
        <input
          id="estimatedCommission"
          name="estimatedCommission"
          defaultValue={deal?.estimatedCommission ?? ""}
        />
      </Field>
      <Field label="Actual paid (£)" name="actualPaid">
        <input id="actualPaid" name="actualPaid" defaultValue={deal?.actualPaid ?? ""} />
      </Field>
      <div className="md:col-span-2">
        <Field label="Notes" name="notes">
          <textarea id="notes" name="notes" rows={3} defaultValue={deal?.notes ?? ""} />
        </Field>
      </div>
      <div className="md:col-span-2 flex justify-end">
        <button className="btn btn-primary" disabled={pending}>
          {pending
            ? "Saving…"
            : deal
              ? "Save contract"
              : lockCustomer
                ? "Record deal on this customer"
                : "Record contract"}
        </button>
      </div>
    </form>
  );
}

export function TenderForm({
  tender,
  customerId,
  leads,
  presetLeadId,
  embedded,
}: {
  tender?: TenderResponse;
  customerId: string;
  leads: Lead[];
  presetLeadId?: string;
  embedded?: boolean;
}) {
  const [state, action, pending] = useActionState(saveTenderResponse, empty as TenderState);
  return (
    <form
      action={action}
      className={embedded ? "grid gap-4 p-4 md:grid-cols-2" : "card grid gap-4 p-5 md:grid-cols-2"}
    >
      {tender ? <input type="hidden" name="id" value={tender.id} /> : null}
      <input type="hidden" name="customerId" value={customerId} />
      <div className="md:col-span-2">
        <ErrorBanner message={state.error} />
      </div>
      <Field label="Supplier" name="supplier">
        <input
          id="tenderSupplier"
          name="supplier"
          list="tender-suppliers"
          required
          defaultValue={tender?.supplier}
        />
        <datalist id="tender-suppliers">
          {UK_SUPPLIERS.map((supplier) => (
            <option key={supplier} value={supplier} />
          ))}
        </datalist>
      </Field>
      <Field label="Fuel" name="fuelType">
        <select id="tenderFuelType" name="fuelType" required defaultValue={tender?.fuelType ?? "ELECTRIC"}>
          {FUEL_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date received" name="receivedOn">
        <input
          id="receivedOn"
          name="receivedOn"
          type="date"
          defaultValue={toDateInput(tender?.receivedOn) || toDateInput(new Date())}
        />
      </Field>
      <Field label="Status" name="status">
        <select id="tenderStatus" name="status" defaultValue={tender?.status ?? "RECEIVED"}>
          {TENDER_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Standing charge (p/day)" name="standingCharge" hint="As quoted by the supplier.">
        <input
          id="standingCharge"
          name="standingCharge"
          defaultValue={tender?.standingCharge ?? ""}
          placeholder="118"
        />
      </Field>
      <Field
        label="Unit rate(s)"
        name="unitRates"
        hint="Day / night / weekend — however the quote was written."
      >
        <input
          id="unitRates"
          name="unitRates"
          defaultValue={tender?.unitRates ?? ""}
          placeholder="Day 25.8p / Night 15.1p"
        />
      </Field>
      <Field label="Contract length (months)" name="contractLengthMonths">
        <input
          id="contractLengthMonths"
          name="contractLengthMonths"
          defaultValue={tender?.contractLengthMonths ?? ""}
          placeholder="24"
        />
      </Field>
      <Field label="Estimated annual cost (£)" name="estimatedAnnualCost">
        <input
          id="estimatedAnnualCost"
          name="estimatedAnnualCost"
          defaultValue={tender?.estimatedAnnualCost ?? ""}
          placeholder="98400"
        />
      </Field>
      <Field label="Link to lead" name="leadId">
        <select id="tenderLeadId" name="leadId" defaultValue={tender?.leadId ?? presetLeadId ?? ""}>
          <option value="">Not linked</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.title}
            </option>
          ))}
        </select>
      </Field>
      <div className="md:col-span-2">
        <Field label="Notes" name="notes">
          <textarea
            id="tenderNotes"
            name="notes"
            rows={2}
            defaultValue={tender?.notes ?? ""}
            placeholder="Validity, exit fees, why preferred or declined…"
          />
        </Field>
      </div>
      <div className="md:col-span-2 flex justify-end">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : tender ? "Save tender response" : "Add tender response"}
        </button>
      </div>
    </form>
  );
}

export function AgentForm({ agent }: { agent?: Agent }) {
  const [state, action, pending] = useActionState(saveAgent, empty as AgentState);
  return (
    <form action={action} className="card grid gap-4 p-5 md:grid-cols-2">
      {agent ? <input type="hidden" name="id" value={agent.id} /> : null}
      <div className="md:col-span-2">
        <ErrorBanner message={state.error} />
      </div>
      <Field label="Name" name="name">
        <input id="name" name="name" required defaultValue={agent?.name} />
      </Field>
      <Field label="Email" name="email">
        <input id="email" name="email" type="email" required defaultValue={agent?.email} />
      </Field>
      <Field label="Role" name="role">
        <select id="role" name="role" defaultValue={agent?.role ?? "Sales"}>
          {AGENT_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </Field>
      <div className="md:col-span-2 flex justify-end">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : agent ? "Save agent" : "Add agent"}
        </button>
      </div>
    </form>
  );
}
