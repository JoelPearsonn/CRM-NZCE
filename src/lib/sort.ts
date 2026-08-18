export function sortDir(value: string | undefined) {
  return value === "desc" ? "desc" : "asc";
}

export function flipDir(dir: "asc" | "desc") {
  return dir === "asc" ? "desc" : "asc";
}

export function sortHref(
  path: string,
  current: URLSearchParams,
  key: string,
  activeKey: string,
  activeDir: "asc" | "desc",
) {
  const next = new URLSearchParams(current);
  next.set("sort", key);
  next.set("dir", activeKey === key ? flipDir(activeDir) : "asc");
  return `${path}?${next}`;
}
