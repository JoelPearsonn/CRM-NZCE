"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type SearchHit = {
  id: string;
  type: "customer" | "meter" | "lead" | "deal";
  title: string;
  subtitle: string;
  href: string;
};

type SearchResponse = {
  customers: SearchHit[];
  meters: SearchHit[];
  leads: SearchHit[];
  deals: SearchHit[];
};

const groups: { key: keyof SearchResponse; label: string }[] = [
  { key: "customers", label: "Customers" },
  { key: "meters", label: "Meters" },
  { key: "leads", label: "Leads" },
  { key: "deals", label: "Contracts" },
];

export function MasterSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
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
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!response.ok) return;
      setResults((await response.json()) as SearchResponse);
      setOpen(true);
    }, 180);
    return () => window.clearTimeout(handle);
  }, [query]);

  const visible = query.trim().length < 2 ? null : results;
  const total = visible
    ? groups.reduce((sum, group) => sum + visible[group.key].length, 0)
    : 0;

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <label className="sr-only" htmlFor="master-search">
        Master search
      </label>
      <input
        id="master-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => visible && setOpen(true)}
        placeholder="Search name, MPAN, MPRN, email, company…"
        className="w-full border border-rule bg-paper-2 px-3 py-2 font-sans text-sm text-ink outline-none focus:border-brass"
      />
      {open && query.trim().length >= 2 ? (
        <div className="absolute z-30 mt-1 max-h-[28rem] w-full overflow-auto border border-rule bg-card shadow-lg">
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
                      <div className="text-sm font-medium text-ink">{hit.title}</div>
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
