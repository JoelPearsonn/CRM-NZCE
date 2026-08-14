"use client";

import { useActionState, useEffect, useState } from "react";
import { runImport, type ImportState } from "@/app/actions/import";
import { ErrorBanner } from "@/components/ui";

const empty: ImportState = {};

export function CsvImportForm() {
  const [state, action, pending] = useActionState(runImport, empty);
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [dirty, setDirty] = useState(true);
  const preview = state.preview;
  const canCommit = Boolean(preview && csvText && !dirty && !state.committed);

  useEffect(() => {
    if (state.preview) setDirty(false);
  }, [state.preview]);

  return (
    <form action={action} className="card p-5">
      <ErrorBanner message={state.error} />
      <p className="text-sm text-muted">
        Upload the NZCE template. Existing customers are matched by email or company name. Meters
        are matched by MPAN or MPRN and updated — nothing is deleted. Preview the rows before you
        import.
      </p>
      <input type="hidden" name="csv" value={csvText} />
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="field min-w-[16rem] flex-1">
          <span>CSV file</span>
          <input
            name="file"
            type="file"
            accept=".csv,text/csv"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                setCsvText("");
                setFileName("");
                setDirty(true);
                return;
              }
              setFileName(file.name);
              setCsvText(await file.text());
              setDirty(true);
            }}
          />
          {fileName ? <span className="text-[0.7rem] text-muted">{fileName}</span> : null}
        </label>
        <button className="btn btn-ghost" name="intent" value="preview" disabled={pending || !csvText}>
          {pending ? "Reading…" : "Preview"}
        </button>
        <button className="btn btn-primary" name="intent" value="commit" disabled={pending || !canCommit}>
          {pending ? "Importing…" : "Import"}
        </button>
      </div>
      {!preview && csvText ? (
        <p className="mt-3 text-xs text-muted">Preview the file before it is written to the book.</p>
      ) : null}

      {state.committed ? (
        <p className="mt-4 text-sm text-moss">
          Imported {state.committed.createCustomers} customer
          {state.committed.createCustomers === 1 ? "" : "s"}, {state.committed.createMeters} new
          meter{state.committed.createMeters === 1 ? "" : "s"}, updated{" "}
          {state.committed.updateMeters} existing meter
          {state.committed.updateMeters === 1 ? "" : "s"}.
        </p>
      ) : null}

      {preview ? (
        <div className="mt-5 overflow-x-auto">
          <p className="mb-2 text-sm">
            Preview · {preview.createCustomers} new customers · {preview.createMeters} new meters ·{" "}
            {preview.updateMeters} updates · {preview.blocked} blocked
          </p>
          <table className="desk-table">
            <thead>
              <tr>
                <th>Line</th>
                <th>Company</th>
                <th>Site</th>
                <th>Supply</th>
                <th>Action</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.line}>
                  <td>{row.line}</td>
                  <td>
                    <div className="font-medium">{row.companyName || "—"}</div>
                    <div className="text-[0.7rem] text-muted">{row.email}</div>
                  </td>
                  <td>{row.siteName || "—"}</td>
                  <td className="meter-id">
                    {row.mpan ? <div>E {row.mpan}</div> : null}
                    {row.mprn ? <div>G {row.mprn}</div> : null}
                  </td>
                  <td>{row.action.replaceAll("_", " ")}</td>
                  <td className={row.errors.length ? "text-danger" : "text-muted"}>
                    {row.errors.join(" ") ||
                      (row.customerMatch ? `Customer: ${row.customerMatch}. ` : "New customer. ") +
                        (row.meterMatch ? `Update ${row.meterMatch}.` : "New meter.")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </form>
  );
}
