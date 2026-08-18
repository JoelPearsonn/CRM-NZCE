"use client";

import { useState } from "react";

export function useImportAction<S extends { error?: string; preview?: unknown; committed?: unknown }>(
  run: (prev: S, formData: FormData) => Promise<S>,
  empty: S,
) {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [state, setState] = useState<S>(empty);
  const [pending, setPending] = useState(false);
  const [previewedText, setPreviewedText] = useState("");

  const canCommit = Boolean(state.preview && csvText && csvText === previewedText && !state.committed);

  async function onFileChange(file: File | undefined) {
    // A form reset after a server action fires change with no file. Keep the CSV.
    if (!file) return;
    setFileName(file.name);
    setCsvText(await file.text());
    setState(empty);
    setPreviewedText("");
  }

  function onPasteText(text: string) {
    setCsvText(text);
    if (!text) setFileName("");
    setState(empty);
    setPreviewedText("");
  }

  async function submit(intent: "preview" | "commit") {
    if (!csvText) {
      setState({ ...empty, error: "Choose a CSV file." });
      return;
    }
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("csv", csvText);
      formData.set("intent", intent);
      const next = await run(state, formData);
      setState(next);
      if (next.preview && !next.error) setPreviewedText(csvText);
    } catch {
      setState({ ...empty, error: "Import did not finish. Try Preview again." });
    } finally {
      setPending(false);
    }
  }

  return { csvText, fileName, state, pending, canCommit, onFileChange, onPasteText, submit };
}
