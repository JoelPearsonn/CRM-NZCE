import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const ROOT = path.join(process.cwd(), "uploads", "recordings");

const ALLOWED_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/flac",
  "text/plain",
  "text/vtt",
  "application/x-subrip",
]);

const ALLOWED_EXT = new Set([
  ".mp3",
  ".wav",
  ".webm",
  ".ogg",
  ".m4a",
  ".aac",
  ".flac",
  ".txt",
  ".vtt",
  ".srt",
]);

export function recordingDiskPath(storedName: string) {
  return path.join(ROOT, storedName);
}

function extensionOf(name: string) {
  const match = name.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? "";
}

export function isRecordingFile(file: File) {
  const ext = extensionOf(file.name);
  if (file.type && ALLOWED_TYPES.has(file.type)) return true;
  return ALLOWED_EXT.has(ext);
}

export async function storeRecordingFile(customerId: string, file: File) {
  if (file.size <= 0) return null;
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Recording or transcript must be under 20MB.");
  }
  if (!isRecordingFile(file)) {
    throw new Error("Upload an audio file or a text transcript (.txt, .vtt, .srt).");
  }

  await mkdir(ROOT, { recursive: true });
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "recording";
  const storedName = `${customerId}-${Date.now()}-${safe}`;
  await writeFile(path.join(ROOT, storedName), Buffer.from(await file.arrayBuffer()));
  return {
    fileName: file.name,
    storedName,
    mimeType: file.type || null,
  };
}

export async function readRecordingFile(storedName: string) {
  return readFile(path.join(ROOT, storedName));
}

export async function removeRecordingFile(storedName: string | null | undefined) {
  if (!storedName) return;
  try {
    await unlink(path.join(ROOT, storedName));
  } catch {
    // already gone
  }
}

export async function writeSeedRecording(storedName: string, body: string) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(path.join(ROOT, storedName), body, "utf8");
}
