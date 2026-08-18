import { readZip, writeZip } from "../../src/lib/zip-store";

const NAVY = "1F497D";

function documentXml(splitCompany: boolean) {
  const company = splitCompany
    ? `<w:r><w:t>{{</w:t></w:r><w:r><w:t>companyName</w:t></w:r><w:r><w:t>}}</w:t></w:r>`
    : `<w:r><w:t>{{companyName}}</w:t></w:r>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:color w:val="${NAVY}"/></w:rPr>
        <w:t>Letter</w:t>
      </w:r>
      ${company}
      <w:r><w:t>{{tradingName}} {{addressLine1}} {{town}} {{country}} {{postcode}} {{companyNumber}} {{loaDate}} {{contactName}} {{position}} {{phone}} {{email}}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
}

function headerXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:r><w:rPr><w:color w:val="${NAVY}"/></w:rPr><w:t>{{phone}}</w:t></w:r></w:p>
</w:hdr>`;
}

export function buildTestLoaDocx(options?: { splitCompany?: boolean }) {
  return writeZip([
    { name: "[Content_Types].xml", data: Buffer.from('<?xml version="1.0"?><Types/>', "utf8") },
    { name: "word/document.xml", data: Buffer.from(documentXml(Boolean(options?.splitCompany)), "utf8") },
    { name: "word/header1.xml", data: Buffer.from(headerXml(), "utf8") },
  ]);
}

export function xmlFromDocx(docx: Buffer, part = "word/document.xml") {
  const entry = readZip(docx).find((item) => item.name === part);
  return entry?.data.toString("utf8") ?? "";
}
