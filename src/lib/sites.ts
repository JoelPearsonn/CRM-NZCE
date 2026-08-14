export type SiteMeter = {
  siteName: string | null;
  siteAddress: string | null;
};

export function siteKey(meter: SiteMeter) {
  return (meter.siteName ?? "Unnamed site").trim().toLowerCase() || "unnamed site";
}

export function groupMetersBySite<T extends SiteMeter>(meters: T[]) {
  const groups: { name: string; address: string | null; meters: T[] }[] = [];
  const index = new Map<string, number>();

  for (const meter of meters) {
    const key = siteKey(meter);
    const existing = index.get(key);
    if (existing == null) {
      index.set(key, groups.length);
      groups.push({
        name: meter.siteName?.trim() || "Unnamed site",
        address: meter.siteAddress?.trim() || null,
        meters: [meter],
      });
    } else {
      groups[existing].meters.push(meter);
      if (!groups[existing].address && meter.siteAddress) {
        groups[existing].address = meter.siteAddress.trim();
      }
    }
  }

  return groups;
}

export function siteCount(meters: SiteMeter[]) {
  return groupMetersBySite(meters).length;
}
