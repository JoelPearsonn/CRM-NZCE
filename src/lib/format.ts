export function gbp(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function gbpExact(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

export function pence(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}p`;
}

export function monthsLabel(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value === 1 ? "1 month" : `${value} months`;
}

export function kwh(value: number | null | undefined) {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("en-GB").format(value)} kWh`;
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function parseDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseIntField(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(/,/g, "");
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(/[£,]/g, "");
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

export function daysUntil(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const target = new Date(date);
  target.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function renewalTone(value: Date | string | null | undefined) {
  const days = daysUntil(value);
  if (days == null) return "muted";
  if (days < 0) return "overdue";
  if (days <= 30) return "urgent";
  if (days <= 90) return "soon";
  return "ok";
}

export function formatMpan(mpan: string | null | undefined) {
  if (!mpan) return "—";
  const digits = mpan.replace(/\s/g, "");
  if (digits.length < 13) return digits;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

export function str(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export function optionalStr(value: FormDataEntryValue | null) {
  const next = str(value);
  return next || null;
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
