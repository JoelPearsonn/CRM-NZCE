export function parseCsvDate(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T12:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const uk = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (uk) {
    const date = new Date(Date.UTC(Number(uk[3]), Number(uk[2]) - 1, Number(uk[1]), 12));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function parseCsvMoney(value: string | null | undefined) {
  const raw = String(value ?? "").trim().replace(/[£,]/g, "");
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? null : parsed;
}
