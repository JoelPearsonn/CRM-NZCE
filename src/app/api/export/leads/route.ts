import { parseLeadFilters } from "@/lib/book-filters";
import { exportLeadsCsv } from "@/lib/csv-export";

export async function GET(request: Request) {
  return exportLeadsCsv(parseLeadFilters(new URL(request.url).searchParams));
}
