import {
  portalContractOf,
  portalCustomerOf,
  portalMeterOf,
  portalRenewalsOf,
  type PortalContract,
  type PortalCustomer,
  type PortalMeter,
  type PortalRenewal,
} from "@/lib/portal-data";
import { prisma, type DeskPrisma } from "@/lib/prisma";

export type PortalBook = {
  customer: PortalCustomer;
  contracts: PortalContract[];
  meters: PortalMeter[];
  renewals: PortalRenewal[];
};

export async function loadPortalBook(customerId: string, db: DeskPrisma = prisma): Promise<PortalBook | null> {
  const customer = await db.customer.findFirst({
    where: { id: customerId, archivedAt: null },
    include: {
      meters: { orderBy: [{ siteName: "asc" }, { fuelType: "asc" }] },
      deals: { include: { meter: true }, orderBy: { renewalDate: "asc" } },
    },
  });
  if (!customer) return null;
  return {
    customer: portalCustomerOf(customer),
    contracts: customer.deals.map((deal) => portalContractOf(deal)),
    meters: customer.meters.map((meter) => portalMeterOf(meter)),
    renewals: portalRenewalsOf(customer.meters, customer.deals),
  };
}
