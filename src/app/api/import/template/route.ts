import { csvTemplate } from "@/lib/csv-import";
import { rejectUnlessStaff } from "@/lib/staff-auth";

export async function GET(request: Request) {
  const denied = rejectUnlessStaff(request);
  if (denied) return denied;
  return new Response(csvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nzce-customers-meters-template.csv"',
    },
  });
}
