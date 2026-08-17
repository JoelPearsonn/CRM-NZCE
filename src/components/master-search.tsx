"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoaPill, ObjectionPill } from "@/components/ui";
import {
  flattenHits,
  pickEnterDestination,
  searchResultsHref,
  type SearchHit,
  type SearchResponse,
} from "@/lib/master-search";

const groups: { key: keyof SearchResponse; label: string; type: SearchHit["type"] }[] = [
  { key: "customers", label: "Customers", type: "customer" },
  { key: "meters", label: "Meters", type: "meter" },
  { key: "leads", label: "Leads", type: "lead" },
  { key: "deals", label: "Contracts", type: "deal" },
];

async function fetchSearch(q: string, type: string): Promise<SearchResponse | null> {
  const params = new URLSearchParams({ q });
  if (type) params.set("type", type);
  const response = await fetch(`/api/search?${params}`);
  if (!response.ok) return null;
  return (await response.json()) as SearchResponse;
}

export function MasterSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [resultQuery, setResultQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const handle = window.setTimeout(async () => {
      const data = await fetchSearch(q, type);
      if (!data) return;
      setResults(data);
      setResultQuery(q);
      setOpen(true);
    }, 180);
    return () => window.clearTimeout(handle);
  }, [query, type]);

  const visible = query.trim().length < 2 ? null : results;
  const total = visible ? flattenHits(visible).length : 0;

  function openHit(hit: SearchHit) {
    setOpen(false);
    setQuery("");
    router.push(hit.href);
  }

  async function goToMatch(raw: string) {
    const q = raw.trim();
    if (q.length < 2) {
      setOpen(true);
      return;
    }
    setPending(true);
    const data =
      resultQuery === q && results
        ? results
        : await fetchSearch(q, type);
    if (data) {
      setResults(data);
      setResultQuery(q);
    }
    const picked = pickEnterDestination(data ?? { customers: [], meters: [], leads: [], deals: [] }, q, pathname);
    if ("href" in picked) {
      openHit(picked.hit);
    } else if ("resultsPage" in picked) {
      setOpen(false);
      router.push(searchResultsHref(q));
    } else {
      setOpen(true);
    }
    setPending(false);
  }

  return (
    <div
      ref={boxRef}
      className="master-search relative min-w-0 w-full max-w-2xl flex-1"
      data-testid="master-search"
    >
      <form
        action="/search"
        onSubmit={(event) => {
          event.preventDefault();
          void goToMatch(query);
        }}
      >
        <label
          className="mb-0.5 block text-[0.68rem] font-semibold tracking-[0.12em] text-muted uppercase"
          htmlFor="master-search"
        >
          Search the book
        </label>
        <input
          id="master-search"
          name="q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => visible && setOpen(true)}
          placeholder="Customer, contact, MPAN, MPRN, email…"
          autoComplete="off"
          disabled={pending}
          className="h-11 w-full border border-rule bg-paper-2 px-3 py-2 font-sans text-base text-ink outline-none focus:border-brass md:text-sm"
        />
      </form>
      {open && query.trim().length >= 2 ? (
        <div className="absolute z-30 mt-1 max-h-[min(28rem,70vh)] w-full overflow-auto border border-rule bg-card shadow-lg">
          <div className="flex flex-wrap gap-1 border-b border-rule bg-[#f6f1e6] px-2 py-2">
            {[
              { value: "", label: "All" },
              { value: "customer", label: "Customers" },
              { value: "meter", label: "Meters" },
              { value: "lead", label: "Leads" },
              { value: "deal", label: "Contracts" },
            ].map((item) => (
              <button
                key={item.value || "all"}
                type="button"
                tabIndex={-1}
                onClick={() => setType(item.value)}
                className={`btn min-h-11 px-3 py-2 text-[0.75rem] ${type === item.value ? "btn-brass" : "btn-ghost"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {pending ? (
            <p className="px-3 py-4 text-sm text-muted">Opening…</p>
          ) : total === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">No matches on the desk.</p>
          ) : (
            groups.map((group) => {
              const hits = visible?.[group.key] ?? [];
              if (!hits.length) return null;
              return (
                <div key={group.key} className="border-b border-rule last:border-b-0">
                  <p className="bg-[#f6f1e6] px-3 py-1.5 text-[0.65rem] font-semibold tracking-[0.12em] text-muted uppercase">
                    {group.label}
                  </p>
                  {hits.map((hit) => (
                    <Link
                      key={`${hit.type}-${hit.id}`}
                      href={hit.href}
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                      }}
                      className="block min-h-11 px-3 py-2.5 hover:bg-[#f7f2e7]"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-ink">{hit.title}</span>
                        {hit.loaStatus ? <LoaPill value={hit.loaStatus} /> : null}
                        {hit.objectionStatus && hit.objectionStatus !== "NONE" ? (
                          <ObjectionPill value={hit.objectionStatus} />
                        ) : null}
                      </div>
                      <div className="meter-id text-muted">{hit.subtitle}</div>
                    </Link>
                  ))}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
