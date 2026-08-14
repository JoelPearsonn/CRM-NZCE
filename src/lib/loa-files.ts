import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const ROOT = path.join(process.cwd(), "uploads", "loa");

const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function loaDiskPath(storedName: string) {
  return path.join(ROOT, storedName);
}

export async function storeLoaFile(meterId: string, file: File) {
  if (file.size <= 0) return null;
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("LOA file must be under 8MB.");
  }
  if (file.type && !ALLOWED.has(file.type)) {
    throw new Error("Upload a PDF, image, or Word copy of the signed LOA.");
  }

  await mkdir(ROOT, { recursive: true });
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "loa";
  const storedName = `${meterId}-${Date.now()}-${safe}`;
  await writeFile(path.join(ROOT, storedName), Buffer.from(await file.arrayBuffer()));
  return { loaFileName: file.name, loaStoredName: storedName };
}

export async function readLoaFile(storedName: string) {
  return readFile(path.join(ROOT, storedName));
}

export async function removeLoaFile(storedName: string | null | undefined) {
  if (!storedName) return;
  try {
    await unlink(path.join(ROOT, storedName));
  } catch {
    // already gone
  }
}

export async function writeSeedLoa(storedName: string, body: string) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(path.join(ROOT, storedName), body, "utf8");
}
