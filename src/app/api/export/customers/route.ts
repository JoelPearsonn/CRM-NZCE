import { exportCustomersCsv } from "@/lib/csv-export";

export async function GET() {
  return exportCustomersCsv();
}
