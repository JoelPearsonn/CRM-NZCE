export type CustomerLoaItem = {
  key: string;
  href: string;
  fileName: string;
  source: "UPLOAD" | "GENERATED" | "SEND" | "METER";
  sourceLabel: string;
  createdAt: Date | string | null;
  mimeType?: string | null;
};

export function loaSourceLabel(source: CustomerLoaItem["source"]) {
  if (source === "METER") return "Legacy meter copy";
  if (source === "GENERATED") return "Generated letter";
  if (source === "SEND") return "Sent / filled PDF";
  return "Uploaded";
}

export function mergeCustomerLoaItems(input: {
  documents: {
    id: string;
    fileName: string;
    source?: string | null;
    note?: string | null;
    mimeType?: string | null;
    createdAt?: Date | null;
  }[];
  envelopes: {
    id: string;
    pdfFileName?: string | null;
    pdfStoredName?: string | null;
    createdAt?: Date | null;
    channel?: string | null;
  }[];
  meters: {
    id: string;
    loaFileName?: string | null;
    loaStoredName?: string | null;
    siteName?: string | null;
    mpan?: string | null;
    mprn?: string | null;
  }[];
}): CustomerLoaItem[] {
  const items: CustomerLoaItem[] = [];

  for (const document of input.documents) {
    const source =
      document.source === "GENERATED" || document.source === "METER" || document.source === "SEND"
        ? document.source
        : "UPLOAD";
    items.push({
      key: `doc:${document.id}`,
      href: `/api/loa/documents/${document.id}`,
      fileName: document.fileName,
      source,
      sourceLabel: document.note || loaSourceLabel(source),
      createdAt: document.createdAt ?? null,
      mimeType: document.mimeType,
    });
  }

  const storedNames = new Set(input.documents.map((document) => document.fileName));

  for (const envelope of input.envelopes) {
    if (!envelope.pdfFileName || !envelope.pdfStoredName) continue;
    if (storedNames.has(envelope.pdfFileName)) continue;
    items.push({
      key: `env:${envelope.id}`,
      href: `/api/loa/envelope/${envelope.id}`,
      fileName: envelope.pdfFileName,
      source: "SEND",
      sourceLabel: loaSourceLabel("SEND"),
      createdAt: envelope.createdAt ?? null,
      mimeType: "application/pdf",
    });
  }

  for (const meter of input.meters) {
    if (!meter.loaFileName || !meter.loaStoredName) continue;
    const supply = meter.mpan || meter.mprn;
    const site = meter.siteName?.trim();
    items.push({
      key: `meter:${meter.id}`,
      href: `/api/loa/${meter.id}`,
      fileName: meter.loaFileName,
      source: "METER",
      sourceLabel: [loaSourceLabel("METER"), site, supply].filter(Boolean).join(" · "),
      createdAt: null,
    });
  }

  return items.sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime || left.fileName.localeCompare(right.fileName);
  });
}
