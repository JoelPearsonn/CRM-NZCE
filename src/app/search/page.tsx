import Link from "next/link";
import { LoaPill, ObjectionPill, PageHeader } from "@/components/ui";
import { flattenHits } from "@/lib/master-search";
import type { SearchPageProps } from "@/lib/page-props";
import { searchBook } from "@/lib/search";

const groups = [
  { key: "customers" as const, label: "Customers" },
  { key: "meters" as const, label: "Meters" },
  { key: "leads" as const, label: "Leads" },
  { key: "deals" as const, label: "Contracts" },
];

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const results = q.length >= 2 ? await searchBook(q) : { customers: [], meters: [], leads: [], deals: [] };
  const total = flattenHits(results).length;

  return (
    <div className="mx-auto max-w-3xl" data-testid="search-results">
      <PageHeader
        kicker="Search the book"
        title={q ? `Results for “${q}”` : "Search the book"}
        description={
          q.length < 2
            ? "Type at least two characters in Search the book, then press Enter."
            : total
              ? `${total} match${total === 1 ? "" : "es"} on the desk.`
              : "No matches on the desk."
        }
      />
      {groups.map((group) => {
        const hits = results[group.key];
        if (!hits.length) return null;
        return (
          <section key={group.key} className="card mb-4">
            <p className="border-b border-rule bg-[#f6f1e6] px-4 py-2 text-[0.65rem] font-semibold tracking-[0.12em] text-muted uppercase">
              {group.label}
            </p>
            <ul>
              {hits.map((hit) => (
                <li key={`${hit.type}-${hit.id}`}>
                  <Link href={hit.href} className="block px-4 py-3 hover:bg-[#f7f2e7]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-ink">{hit.title}</span>
                      {hit.loaStatus ? <LoaPill value={hit.loaStatus} /> : null}
                      {hit.objectionStatus && hit.objectionStatus !== "NONE" ? (
                        <ObjectionPill value={hit.objectionStatus} />
                      ) : null}
                    </div>
                    <div className="meter-id text-muted">{hit.subtitle}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
