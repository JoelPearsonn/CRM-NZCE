"use client";

import { useState } from "react";

export function CopyNoteButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" className="btn btn-ghost" onClick={copy}>
      {copied ? "Copied" : "Copy note"}
    </button>
  );
}
