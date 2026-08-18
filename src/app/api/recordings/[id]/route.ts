import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readRecordingFile } from "@/lib/recording-files";
import { rejectUnlessStaff } from "@/lib/staff-auth";

export type RecordingLookup = {
  fileName: string;
  storedName: string;
  mimeType: string | null;
  customer: { id: string } | null;
};

export async function handleRecordingDownload(
  request: Request,
  id: string,
  deps: {
    findRecording: (id: string) => Promise<RecordingLookup | null>;
    readFile: (storedName: string) => Promise<Buffer>;
  } = {
    findRecording: (recordingId) =>
      prisma.callRecording.findUnique({
        where: { id: recordingId },
        include: { customer: { select: { id: true } } },
      }),
    readFile: readRecordingFile,
  },
) {
  const denied = rejectUnlessStaff(request);
  if (denied) return denied;

  const recording = await deps.findRecording(id);
  if (!recording?.customer) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }

  try {
    const bytes = await deps.readFile(recording.storedName);
    const lower = recording.fileName.toLowerCase();
    const type =
      recording.mimeType ||
      (lower.endsWith(".txt") || lower.endsWith(".vtt") || lower.endsWith(".srt")
        ? "text/plain"
        : lower.endsWith(".mp3")
          ? "audio/mpeg"
          : lower.endsWith(".wav")
            ? "audio/wav"
            : "application/octet-stream");

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `inline; filename="${recording.fileName.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File is missing from disk." }, { status: 404 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handleRecordingDownload(request, id);
}
