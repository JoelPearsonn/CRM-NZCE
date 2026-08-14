import { csvTemplate } from "@/lib/csv-import";

export async function GET() {
  return new Response(csvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nzce-customers-meters-template.csv"',
    },
  });
}
