import { PAYMENT_STAGES, TPI_PARTNERS, tpiPercentFor } from "@/lib/constants";
import { netCommission, rollupPayments, splitByPercent, type PaymentLike } from "@/lib/finance";
import { parseDate, parseMoney } from "@/lib/format";

export type BuiltPayment = PaymentLike & {
  stage: string;
  label: string;
  percent: number;
  expectedDate: Date | null;
  amountDue: number;
  actualPaid: number;
  sortOrder: number;
};

function stageLabel(stage: string, fallback: string) {
  return PAYMENT_STAGES.find((item) => item.value === stage)?.label ?? fallback;
}

export function resolveTpi(partner: string, rawPercent: number | null) {
  const known = TPI_PARTNERS.some((item) => item.value === partner) ? partner : "NONE";
  const percent = rawPercent == null ? tpiPercentFor(known) : Math.min(100, Math.max(0, rawPercent));
  return { tpiPartner: known, tpiPercent: percent };
}

export function parseDealPayments(formData: FormData): { error?: string; payments: BuiltPayment[] } {
  const count = Math.min(3, Math.max(2, Number(formData.get("paymentCount")) || 3));
  const drafts: { stage: string; label: string; percent: number; expectedDate: Date | null; actualPaid: number }[] =
    [];

  for (let index = 0; index < count; index += 1) {
    const stage = String(formData.get(`paymentStage_${index}`) ?? "").trim() || defaultStage(index, count);
    const label =
      String(formData.get(`paymentLabel_${index}`) ?? "").trim() || stageLabel(stage, `Payment ${index + 1}`);
    const percent = Number(String(formData.get(`paymentPercent_${index}`) ?? "").replace(/%/g, ""));
    if (!Number.isFinite(percent) || percent < 0) {
      return { error: "Each payout needs a % of net commission.", payments: [] };
    }
    drafts.push({
      stage,
      label,
      percent,
      expectedDate: parseDate(formData.get(`paymentDate_${index}`)),
      actualPaid: parseMoney(formData.get(`paymentPaid_${index}`)) ?? 0,
    });
  }

  const total = drafts.reduce((sum, row) => sum + row.percent, 0);
  if (Math.abs(total - 100) > 0.5) {
    return { error: "Payout percentages must add up to 100%.", payments: [] };
  }

  return { payments: drafts.map((row, sortOrder) => ({ ...row, amountDue: 0, sortOrder })) };
}

export function applyPayouts(
  gross: number | null,
  tpiPercent: number,
  drafts: BuiltPayment[],
): { net: number; payments: BuiltPayment[]; rollup: ReturnType<typeof rollupPayments> } {
  const net = netCommission(gross, tpiPercent);
  const amounts = splitByPercent(
    net,
    drafts.map((row) => row.percent),
  );
  const payments = drafts.map((row, index) => ({
    ...row,
    amountDue: amounts[index] ?? 0,
    actualPaid: row.actualPaid ?? 0,
    sortOrder: index,
  }));
  return { net, payments, rollup: rollupPayments(payments) };
}

function defaultStage(index: number, count: number) {
  if (index === 0) return "ON_SIGN";
  if (index === 1) return "ON_LIVE";
  return count === 3 ? "EOC" : "ON_LIVE";
}
