import { parseBookFilters } from "@/lib/book-filters";
import { exportMetersCsv } from "@/lib/csv-export";
import { rejectUnlessStaff } from "@/lib/staff-auth";

export async function GET(request: Request) {
  const denied = rejectUnlessStaff(request);
  if (denied) return denied;
  return exportMetersCsv(parseBookFilters(new URL(request.url).searchParams));
}
