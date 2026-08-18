import { exportDealsCsv } from "@/lib/csv-export";
import { rejectUnlessStaff } from "@/lib/staff-auth";

export async function GET(request: Request) {
  const denied = rejectUnlessStaff(request);
  if (denied) return denied;
  return exportDealsCsv();
}
