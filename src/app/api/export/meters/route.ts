import { parseBookFilters } from "@/lib/book-filters";
import { exportMetersCsv } from "@/lib/csv-export";

export async function GET(request: Request) {
  return exportMetersCsv(parseBookFilters(new URL(request.url).searchParams));
}
