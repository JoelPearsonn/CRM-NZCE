import { parseLeadFilters } from "@/lib/book-filters";
import { exportLeadsCsv } from "@/lib/csv-export";
import { rejectUnlessStaff } from "@/lib/staff-auth";

export async function GET(request: Request) {
  const denied = rejectUnlessStaff(request);
  if (denied) return denied;
  return exportLeadsCsv(parseLeadFilters(new URL(request.url).searchParams));
}
