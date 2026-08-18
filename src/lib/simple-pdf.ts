function escapePdf(text: string) {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ");
}

export type PdfRun = {
  text: string;
  x: number;
  y: number;
  size: number;
  bold?: boolean;
};

export function wrapPdfText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function buildSimplePdf(pages: PdfRun[][]) {
  const bodies: string[] = [];
  const add = (body: string) => {
    bodies.push(body);
    return bodies.length;
  };

  const fontRegular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const contentIds: number[] = [];
  const pageIds: number[] = [];

  for (const runs of pages) {
    const stream = [
      "BT",
      ...runs.flatMap((run) => [
        `/${run.bold ? "F2" : "F1"} ${run.size} Tf`,
        `1 0 0 1 ${run.x.toFixed(1)} ${run.y.toFixed(1)} Tm`,
        `(${escapePdf(run.text)}) Tj`,
      ]),
      "ET",
    ].join("\n");
    contentIds.push(add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`));
    pageIds.push(0);
  }

  const pagesId = bodies.length + pageIds.length + 1;
  for (let i = 0; i < contentIds.length; i += 1) {
    pageIds[i] = add(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${contentIds[i]} 0 R /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> >>`,
    );
  }
  add(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`);
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const header = "%PDF-1.4\n";
  const chunks = bodies.map((body, index) => `${index + 1} 0 obj\n${body}\nendobj\n`);
  let offset = Buffer.byteLength(header);
  const xref = [0];
  for (const chunk of chunks) {
    xref.push(offset);
    offset += Buffer.byteLength(chunk);
  }
  const xrefTable = [
    "xref",
    `0 ${bodies.length + 1}`,
    "0000000000 65535 f ",
    ...xref.slice(1).map((value) => `${String(value).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${bodies.length + 1} /Root ${catalogId} 0 R >>`,
    "startxref",
    String(offset),
    "%%EOF",
  ].join("\n");

  return Buffer.concat([Buffer.from(header, "latin1"), ...chunks.map((chunk) => Buffer.from(chunk, "latin1")), Buffer.from(xrefTable, "latin1")]);
}
