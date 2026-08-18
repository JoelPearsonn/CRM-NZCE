export type BookFilters = {
  renewal: string;
  loa: string;
  objection: string;
  salesperson: string;
  showArchived: boolean;
};

export type LeadFilters = {
  stage: string;
  agent: string;
  q: string;
};

type Query = Record<string, string | string[] | undefined> | URLSearchParams;

function q(query: Query, key: string) {
  if (query instanceof URLSearchParams) return query.get(key) ?? "";
  const value = query[key];
  return typeof value === "string" ? value : "";
}

export function parseBookFilters(query: Query): BookFilters {
  return {
    renewal: q(query, "renewal"),
    loa: q(query, "loa"),
    objection: q(query, "objection"),
    salesperson: q(query, "salesperson"),
    showArchived: q(query, "archived") === "1",
  };
}

export function parseLeadFilters(query: Query): LeadFilters {
  return {
    stage: q(query, "stage"),
    agent: q(query, "agent"),
    q: q(query, "q"),
  };
}

export function bookFilterParams(filters: BookFilters) {
  const params = new URLSearchParams();
  if (filters.renewal) params.set("renewal", filters.renewal);
  if (filters.loa) params.set("loa", filters.loa);
  if (filters.objection) params.set("objection", filters.objection);
  if (filters.salesperson) params.set("salesperson", filters.salesperson);
  if (filters.showArchived) params.set("archived", "1");
  return params;
}

export function leadFilterParams(filters: LeadFilters) {
  const params = new URLSearchParams();
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.agent) params.set("agent", filters.agent);
  if (filters.q) params.set("q", filters.q);
  return params;
}

export function leadMatchesSearch(
  lead: {
    title: string;
    notes?: string | null;
    customer: {
      companyName: string;
      tradingName?: string | null;
      contactName: string;
      email: string;
      meters?: { mpan: string | null; mprn: string | null; siteName: string | null }[];
    };
    allocations?: { agent: { name: string } }[];
  },
  raw: string,
) {
  const query = raw.trim();
  if (!query) return true;
  const needle = query.toLowerCase();
  const digits = query.replace(/\D/g, "");
  const fields = [
    lead.title,
    lead.notes,
    lead.customer.companyName,
    lead.customer.tradingName,
    lead.customer.contactName,
    lead.customer.email,
    ...(lead.customer.meters ?? []).flatMap((meter) => [meter.siteName, meter.mpan, meter.mprn]),
    ...(lead.allocations ?? []).map((row) => row.agent.name),
  ];
  if (fields.some((field) => field && field.toLowerCase().includes(needle))) return true;
  if (digits.length >= 4) {
    return (lead.customer.meters ?? []).some(
      (meter) => (meter.mpan && meter.mpan.includes(digits)) || (meter.mprn && meter.mprn.includes(digits)),
    );
  }
  return false;
}

export function exportHref(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function customerArchiveWhere(showArchived: boolean) {
  return showArchived ? { archivedAt: { not: null } } : { archivedAt: null };
}

export function meterMatchesFilters(
  meter: {
    renewalDate: Date | null;
    loaStatus: string;
    objectionStatus: string;
    salespersonId: string | null;
  },
  filters: BookFilters,
  now = new Date(),
) {
  if (filters.renewal) {
    const days = Number(filters.renewal);
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + days);
    if (!meter.renewalDate || meter.renewalDate > horizon) return false;
  }
  if (filters.loa === "unsigned") {
    if (meter.loaStatus === "SIGNED" || meter.loaStatus === "RECEIVED") return false;
  } else if (filters.loa && meter.loaStatus !== filters.loa) {
    return false;
  }
  if (filters.objection && meter.objectionStatus !== filters.objection) return false;
  if (filters.salesperson && meter.salespersonId !== filters.salesperson) return false;
  return true;
}

export function customerMatchesFilters(
  customer: {
    meters: Array<{
      renewalDate: Date | null;
      loaStatus: string;
      objectionStatus: string;
      salespersonId: string | null;
    }>;
  },
  filters: BookFilters,
  now = new Date(),
) {
  const meterFilters = Boolean(
    filters.renewal || filters.loa || filters.objection || filters.salesperson,
  );
  if (!meterFilters) return true;
  return customer.meters.some((meter) => meterMatchesFilters(meter, filters, now));
}
