import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readRecordingFile } from "@/lib/recording-files";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recording = await prisma.callRecording.findUnique({ where: { id } });
  if (!recording) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }

  try {
    const bytes = await readRecordingFile(recording.storedName);
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
