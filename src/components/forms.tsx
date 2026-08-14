"use client";

import { useActionState } from "react";
import type { Agent, Customer, Deal, Lead, Meter } from "@prisma/client";
import { saveAgent, type ActionState as AgentState } from "@/app/actions/agents";
import { saveCustomer, type ActionState as CustomerState } from "@/app/actions/customers";
import { saveDeal, type ActionState as DealState } from "@/app/actions/deals";
import { saveLead, type ActionState as LeadState } from "@/app/actions/leads";
import { saveMeter, type ActionState as MeterState } from "@/app/actions/meters";
import { ErrorBanner, Field } from "@/components/ui";
import {
  AGENT_ROLES,
  DEAL_STATUSES,
  FUEL_TYPES,
  LEAD_STAGES,
  LOA_STATUSES,
  METER_TYPES,
  SETTLEMENT_TYPES,
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
      <Field label="Email" name="email">
        <input id="email" name="email" type="email" required defaultValue={customer?.email} />
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
          {pending ? "Saving…" : customer ? "Save customer" : "Add customer"}
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
    <form action={action} className="card grid gap-4 p-5 md:grid-cols-2">
      {meter ? <input type="hidden" name="id" value={meter.id} /> : null}
      <input type="hidden" name="customerId" value={customerId} />
      <div className="md:col-span-2">
        <ErrorBanner message={state.error} />
      </div>
      <Field label="Site name" name="siteName">
        <input id="siteName" name="siteName" defaultValue={meter?.siteName ?? ""} />
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
        <Field label="Site address" name="siteAddress">
          <input id="siteAddress" name="siteAddress" defaultValue={meter?.siteAddress ?? ""} />
        </Field>
      </div>
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
        <select id="stage" name="stage" defaultValue={lead?.stage ?? "NEW"}>
          {LEAD_STAGES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
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
}: {
  deal?: Deal;
  customers: Customer[];
  meters: Meter[];
  leads: Lead[];
  agents: Agent[];
  presetCustomerId?: string;
}) {
  const [state, action, pending] = useActionState(saveDeal, empty as DealState);
  return (
    <form action={action} className="card grid gap-4 p-5 md:grid-cols-2">
      {deal ? <input type="hidden" name="id" value={deal.id} /> : null}
      <div className="md:col-span-2">
        <ErrorBanner message={state.error} />
      </div>
      <Field label="Customer" name="customerId">
        <select id="customerId" name="customerId" required defaultValue={deal?.customerId ?? presetCustomerId ?? ""}>
          <option value="">Select customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.companyName}
            </option>
          ))}
        </select>
      </Field>
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
      <Field label="Meter" name="meterId">
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
      <Field label="Salesperson" name="salespersonId">
        <select id="salespersonId" name="salespersonId" defaultValue={deal?.salespersonId ?? ""}>
          <option value="">Unassigned</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </Field>
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
          {pending ? "Saving…" : deal ? "Save contract" : "Record contract"}
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
