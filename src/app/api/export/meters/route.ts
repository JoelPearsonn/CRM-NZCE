import { exportMetersCsv } from "@/lib/csv-export";

export async function GET() {
  return exportMetersCsv();
}
