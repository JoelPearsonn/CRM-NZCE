import { parseBookFilters } from "@/lib/book-filters";
import { exportCustomersCsv } from "@/lib/csv-export";
import { rejectUnlessStaff } from "@/lib/staff-auth";

export async function GET(request: Request) {
  const denied = rejectUnlessStaff(request);
  if (denied) return denied;
  return exportCustomersCsv(parseBookFilters(new URL(request.url).searchParams));
}
