import { leadsCsvTemplate } from "@/lib/csv-leads";

export async function GET() {
  return new Response(leadsCsvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nzce-leads-template.csv"',
    },
  });
}
