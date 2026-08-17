import type { Customer, Deal, Meter } from "@prisma/client";
import { formatMpan } from "@/lib/format";

export const PORTAL_FORBIDDEN_KEYS = [
  "tpiPartner",
  "tpiPercent",
  "estimatedCommission",
  "amountDue",
  "actualPaid",
  "actualPaidDate",
  "payoutType",
  "residualMonthly",
  "payments",
  "salesperson",
  "salespersonId",
  "allocations",
  "reconciliations",
] as const;

export type PortalSession = {
  signedIn: true;
  customerId: string;
  email: string;
  companyName: string;
  contactName: string;
};

export type PortalCustomer = {
  id: string;
  companyName: string;
  tradingName: string | null;
  contactName: string;
  email: string;
  phone: string | null;
  addressLine1: string | null;
  city: string | null;
  postcode: string | null;
};

export type PortalContract = {
  id: string;
  supplier: string;
  fuelType: string;
  status: string;
  contractStart: Date | null;
  contractEnd: Date | null;
  renewalDate: Date | null;
  siteName: string | null;
  mpan: string | null;
  mprn: string | null;
};

export type PortalMeter = {
  id: string;
  siteName: string | null;
  siteAddress: string | null;
  fuelType: string;
  mpan: string | null;
  mpanLabel: string | null;
  mprn: string | null;
  electricEac: number | null;
  gasAq: number | null;
  supplier: string | null;
  contractStart: Date | null;
  contractEnd: Date | null;
  renewalDate: Date | null;
  settlement: string | null;
};

export type PortalRenewal = {
  id: string;
  kind: "meter" | "contract";
  siteName: string | null;
  supplier: string | null;
  fuelType: string;
  renewalDate: Date;
  mpan: string | null;
  mprn: string | null;
};

export function portalSessionOf(account: {
  email: string;
  customer: { id: string; companyName: string; contactName: string };
}): PortalSession {
  return {
    signedIn: true,
    customerId: account.customer.id,
    email: account.email,
    companyName: account.customer.companyName,
    contactName: account.customer.contactName,
  };
}

export function portalCustomerOf(customer: Customer): PortalCustomer {
  return {
    id: customer.id,
    companyName: customer.companyName,
    tradingName: customer.tradingName,
    contactName: customer.contactName,
    email: customer.email,
    phone: customer.phone,
    addressLine1: customer.addressLine1,
    city: customer.city,
    postcode: customer.postcode,
  };
}

export function portalContractOf(
  deal: Deal & { meter?: Pick<Meter, "siteName" | "mpan" | "mprn"> | null },
): PortalContract {
  return {
    id: deal.id,
    supplier: deal.supplier,
    fuelType: deal.fuelType,
    status: deal.status,
    contractStart: deal.contractStart,
    contractEnd: deal.contractEnd,
    renewalDate: deal.renewalDate,
    siteName: deal.meter?.siteName ?? null,
    mpan: deal.meter?.mpan ?? null,
    mprn: deal.meter?.mprn ?? null,
  };
}

export function portalMeterOf(meter: Meter): PortalMeter {
  return {
    id: meter.id,
    siteName: meter.siteName,
    siteAddress: meter.siteAddress,
    fuelType: meter.fuelType,
    mpan: meter.mpan,
    mpanLabel: meter.mpan ? formatMpan(meter.mpan) : null,
    mprn: meter.mprn,
    electricEac: meter.electricEac,
    gasAq: meter.gasAq,
    supplier: meter.supplier,
    contractStart: meter.contractStart,
    contractEnd: meter.contractEnd,
    renewalDate: meter.renewalDate,
    settlement: meter.settlement,
  };
}

export function portalRenewalsOf(
  meters: Meter[],
  deals: (Deal & { meter?: Pick<Meter, "siteName" | "mpan" | "mprn"> | null })[],
): PortalRenewal[] {
  const fromMeters = meters
    .filter((meter): meter is Meter & { renewalDate: Date } => Boolean(meter.renewalDate))
    .map((meter) => ({
      id: `meter-${meter.id}`,
      kind: "meter" as const,
      siteName: meter.siteName,
      supplier: meter.supplier,
      fuelType: meter.fuelType,
      renewalDate: meter.renewalDate,
      mpan: meter.mpan,
      mprn: meter.mprn,
    }));
  const fromDeals = deals
    .filter((deal): deal is Deal & { renewalDate: Date; meter?: Pick<Meter, "siteName" | "mpan" | "mprn"> | null } =>
      Boolean(deal.renewalDate),
    )
    .map((deal) => ({
      id: `contract-${deal.id}`,
      kind: "contract" as const,
      siteName: deal.meter?.siteName ?? null,
      supplier: deal.supplier,
      fuelType: deal.fuelType,
      renewalDate: deal.renewalDate,
      mpan: deal.meter?.mpan ?? null,
      mprn: deal.meter?.mprn ?? null,
    }));
  return [...fromMeters, ...fromDeals].sort(
    (a, b) => a.renewalDate.getTime() - b.renewalDate.getTime(),
  );
}

export function collectKeys(value: unknown, into = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, into);
    return into;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      into.add(key);
      collectKeys(child, into);
    }
  }
  return into;
}

export function portalPayloadIsSafe(value: unknown) {
  const keys = collectKeys(value);
  return PORTAL_FORBIDDEN_KEYS.every((key) => !keys.has(key));
}
