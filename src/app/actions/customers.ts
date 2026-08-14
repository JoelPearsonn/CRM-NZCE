"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { isEmail, optionalStr, str } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type DuplicateMatch = {
  id: string;
  companyName: string;
  email: string;
  match: "email" | "company";
};

export type ActionState = { error?: string; duplicate?: DuplicateMatch };

function refreshCustomer(id: string) {
  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
}

export async function saveCustomer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = optionalStr(formData.get("id"));
  const companyName = str(formData.get("companyName"));
  const contactName = str(formData.get("contactName"));
  const email = str(formData.get("email"));
  const phone = optionalStr(formData.get("phone"));

  if (!companyName) return { error: "Company name is required." };
  if (!contactName) return { error: "A named contact is required." };
  if (!email && !phone) {
    return { error: "Add an email or a phone — at least one contact method." };
  }
  if (email && !isEmail(email)) return { error: "Enter a valid email address." };

  const data = {
    companyName,
    tradingName: optionalStr(formData.get("tradingName")),
    contactName,
    email,
    phone,
    addressLine1: optionalStr(formData.get("addressLine1")),
    city: optionalStr(formData.get("city")),
    postcode: optionalStr(formData.get("postcode"))?.toUpperCase() ?? null,
    industry: optionalStr(formData.get("industry")),
  };

  if (id) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return { error: "Customer not found." };
    await prisma.customer.update({ where: { id }, data });
    await logActivity(id, "CUSTOMER_UPDATED", `Customer record updated for ${companyName}.`);
    refreshCustomer(id);
    redirect(`/customers/${id}`);
  }

  if (str(formData.get("confirmDuplicate")) !== "1") {
    const candidates = await prisma.customer.findMany({
      where: {
        OR: [
          email ? { email: { contains: email } } : undefined,
          { companyName: { contains: companyName } },
        ].filter(Boolean) as { email?: { contains: string }; companyName?: { contains: string } }[],
      },
    });
    const clash = candidates.find(
      (row) =>
        (email && row.email.toLowerCase() === email.toLowerCase()) ||
        row.companyName.toLowerCase() === companyName.toLowerCase(),
    );
    if (clash) {
      const match = email && clash.email.toLowerCase() === email.toLowerCase() ? "email" : "company";
      return {
        duplicate: {
          id: clash.id,
          companyName: clash.companyName,
          email: clash.email,
          match,
        },
      };
    }
  }

  const customer = await prisma.customer.create({ data });
  await logActivity(customer.id, "CUSTOMER_CREATED", `Customer ${companyName} added to the desk.`);
  refreshCustomer(customer.id);
  redirect(`/customers/${customer.id}`);
}

export async function archiveCustomer(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) return;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return;
  const archived = !customer.archivedAt;
  await prisma.customer.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
  });
  await logActivity(
    id,
    archived ? "CUSTOMER_ARCHIVED" : "CUSTOMER_RESTORED",
    archived
      ? `${customer.companyName} archived — hidden from the default book, not deleted.`
      : `${customer.companyName} restored to the book.`,
  );
  refreshCustomer(id);
  revalidatePath("/renewals");
  revalidatePath("/leads");
}
