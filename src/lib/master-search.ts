export type SearchHit = {
  id: string;
  type: "customer" | "meter" | "lead" | "deal";
  title: string;
  subtitle: string;
  href: string;
  loaStatus?: string | null;
  objectionStatus?: string | null;
};

export type SearchResponse = {
  customers: SearchHit[];
  meters: SearchHit[];
  leads: SearchHit[];
  deals: SearchHit[];
};

export function flattenHits(results: SearchResponse): SearchHit[] {
  return [...results.customers, ...results.meters, ...results.leads, ...results.deals];
}

export function scoreHit(hit: SearchHit, query: string, preferLead: boolean) {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const title = hit.title.toLowerCase();
  const subtitle = hit.subtitle.toLowerCase();
  let score = 0;
  if (title === q) score += 100;
  if (title.startsWith(q)) score += 40;
  if (title.includes(q)) score += 20;
  if (subtitle.includes(q)) score += 10;
  if (preferLead && hit.type === "lead") score += 15;
  if (!preferLead && hit.type === "customer") score += 15;
  if (hit.type === "meter") score += 8;
  return score;
}

export function pickEnterDestination(
  results: SearchResponse,
  query: string,
  pathname: string,
): { href: string; hit: SearchHit } | { resultsPage: true } | { none: true } {
  const hits = flattenHits(results);
  if (hits.length === 0) return { none: true };
  if (hits.length === 1) {
    const hit = hits[0];
    return { href: hit.href, hit };
  }

  const preferLead = pathname === "/leads" || pathname.startsWith("/leads/");
  const ranked = hits
    .map((hit) => ({ hit, score: scoreHit(hit, query, preferLead) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const second = ranked[1];
  if (top && (!second || top.score > second.score)) {
    return { href: top.hit.href, hit: top.hit };
  }
  return { resultsPage: true };
}

export function searchResultsHref(query: string) {
  return `/search?q=${encodeURIComponent(query.trim())}`;
}
