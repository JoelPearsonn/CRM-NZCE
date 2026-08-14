import { exportDealsCsv } from "@/lib/csv-export";

export async function GET() {
  return exportDealsCsv();
}
