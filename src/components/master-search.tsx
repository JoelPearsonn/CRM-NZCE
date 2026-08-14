"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoaPill, ObjectionPill } from "@/components/ui";

type SearchHit = {
  id: string;
  type: "customer" | "meter" | "lead" | "deal";
  title: string;
  subtitle: string;
  href: string;
  loaStatus?: string | null;
  objectionStatus?: string | null;
};

type SearchResponse = {
  customers: SearchHit[];
  meters: SearchHit[];
  leads: SearchHit[];
  deals: SearchHit[];
};

const groups: { key: keyof SearchResponse; label: string; type: SearchHit["type"] }[] = [
  { key: "customers", label: "Customers", type: "customer" },
  { key: "meters", label: "Meters", type: "meter" },
  { key: "leads", label: "Leads", type: "lead" },
  { key: "deals", label: "Contracts", type: "deal" },
];

function firstHit(results: SearchResponse | null): SearchHit | null {
  if (!results) return null;
  for (const group of groups) {
    const hit = results[group.key][0];
    if (hit) return hit;
  }
  return null;
}

export function MasterSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [open, setOpen] = useState(false);
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
      const params = new URLSearchParams({ q });
      if (type) params.set("type", type);
      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) return;
      setResults((await response.json()) as SearchResponse);
      setResultQuery(q);
      setOpen(true);
    }, 180);
    return () => window.clearTimeout(handle);
  }, [query, type]);

  const visible = query.trim().length < 2 ? null : results;
  const total = visible
    ? groups.reduce((sum, group) => sum + visible[group.key].length, 0)
    : 0;

  function openHit(hit: SearchHit) {
    setOpen(false);
    setQuery("");
    router.push(hit.href);
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (resultQuery !== query.trim()) return;
          const hit = firstHit(visible);
          if (hit) openHit(hit);
        }}
      >
        <label className="sr-only" htmlFor="master-search">
          Master search
        </label>
        <input
          id="master-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => visible && setOpen(true)}
          placeholder="Search name, MPAN, MPRN, email, company…"
          autoComplete="off"
          className="w-full border border-rule bg-paper-2 px-3 py-2 font-sans text-sm text-ink outline-none focus:border-brass"
        />
      </form>
      {open && query.trim().length >= 2 ? (
        <div className="absolute z-30 mt-1 max-h-[28rem] w-full overflow-auto border border-rule bg-card shadow-lg">
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
                className={`btn px-2 py-1 text-[0.68rem] ${type === item.value ? "btn-brass" : "btn-ghost"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {total === 0 ? (
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
                      className="block px-3 py-2 hover:bg-[#f7f2e7]"
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
