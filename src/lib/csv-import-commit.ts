import type { PrismaClient } from "@prisma/client";
import type { ImportPreviewRow } from "@/lib/csv-import";
import { parseCsvDate } from "@/lib/csv-dates";
import { optionalStr, parseIntField } from "@/lib/format";

export type ImportCommitCounts = {
  createCustomers: number;
  createMeters: number;
  updateMeters: number;
};

export async function commitImportRows(
  db: PrismaClient,
  rows: ImportPreviewRow[],
  log?: (customerId: string, type: string, summary: string) => Promise<void>,
): Promise<ImportCommitCounts> {
  let createCustomers = 0;
  let createMeters = 0;
  let updateMeters = 0;

  for (const row of rows) {
    if (row.errors.length || row.action === "SKIP") continue;
    const values = row.values;

    let customer = await db.customer.findFirst({
      where: {
        OR: [{ email: row.email }, { companyName: { equals: row.companyName } }],
      },
    });

    if (!customer) {
      customer = await db.customer.create({
        data: {
          companyName: row.companyName,
          tradingName: optionalStr(values.tradingName),
          contactName: row.contactName,
          email: row.email,
          phone: optionalStr(values.phone),
          industry: optionalStr(values.industry),
          addressLine1: optionalStr(values.addressLine1),
          city: optionalStr(values.city),
          postcode: optionalStr(values.postcode),
        },
      });
      createCustomers += 1;
      await log?.(customer.id, "CUSTOMER_CREATED", `Customer ${customer.companyName} imported from CSV.`);
    } else {
      await db.customer.update({
        where: { id: customer.id },
        data: {
          contactName: row.contactName || customer.contactName,
          phone: optionalStr(values.phone) ?? customer.phone,
          industry: optionalStr(values.industry) ?? customer.industry,
          addressLine1: optionalStr(values.addressLine1) ?? customer.addressLine1,
          city: optionalStr(values.city) ?? customer.city,
          postcode: optionalStr(values.postcode) ?? customer.postcode,
          tradingName: optionalStr(values.tradingName) ?? customer.tradingName,
        },
      });
    }

    const salesperson = optionalStr(values.salespersonEmail)
      ? await db.agent.findFirst({ where: { email: values.salespersonEmail } })
      : null;

    const existing = await db.meter.findFirst({
      where: {
        OR: [
          row.mpan ? { mpan: row.mpan } : undefined,
          row.mprn ? { mprn: row.mprn } : undefined,
        ].filter(Boolean) as { mpan?: string; mprn?: string }[],
      },
    });

    if (existing && existing.customerId !== customer.id) continue;

    const meterData = {
      customerId: customer.id,
      siteName: row.siteName,
      siteAddress: optionalStr(values.siteAddress),
      fuelType: row.fuelType,
      mpan: row.mpan,
      mprn: row.mprn,
      electricEac: parseIntField(values.electricEac),
      gasAq: parseIntField(values.gasAq),
      supplier: optionalStr(values.supplier),
      settlement: optionalStr(values.settlement),
      loaStatus: optionalStr(values.loaStatus)?.toUpperCase() || "NOT_REQUESTED",
      salespersonId: salesperson?.id ?? existing?.salespersonId ?? null,
      contractStart: parseCsvDate(values.contractStart) ?? existing?.contractStart ?? null,
      contractEnd: parseCsvDate(values.contractEnd) ?? existing?.contractEnd ?? null,
      renewalDate: parseCsvDate(values.renewalDate) ?? existing?.renewalDate ?? null,
      currentRates: optionalStr(values.currentRates) ?? existing?.currentRates ?? null,
      meterType: optionalStr(values.meterType) ?? existing?.meterType ?? null,
      objectionStatus:
        optionalStr(values.objectionStatus)?.toUpperCase() || existing?.objectionStatus || "NONE",
      objectionNote: optionalStr(values.objectionNote) ?? existing?.objectionNote ?? null,
    };

    if (existing) {
      await db.meter.update({
        where: { id: existing.id },
        data: meterData,
      });
      updateMeters += 1;
      await log?.(customer.id, "METER_UPDATED", `Meter updated from CSV: ${row.mpan || row.mprn}.`);
    } else {
      await db.meter.create({ data: meterData });
      createMeters += 1;
      await log?.(customer.id, "METER_ADDED", `Meter imported: ${row.mpan || row.mprn}.`);
    }
  }

  return { createCustomers, createMeters, updateMeters };
}
