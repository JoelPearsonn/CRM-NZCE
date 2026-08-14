import { dealsCsvTemplate } from "@/lib/csv-deals";

export async function GET() {
  return new Response(dealsCsvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nzce-deals-template.csv"',
    },
  });
}
