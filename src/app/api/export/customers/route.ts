import { parseBookFilters } from "@/lib/book-filters";
import { exportCustomersCsv } from "@/lib/csv-export";

export async function GET(request: Request) {
  return exportCustomersCsv(parseBookFilters(new URL(request.url).searchParams));
}
