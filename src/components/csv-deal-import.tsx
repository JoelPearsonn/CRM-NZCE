"use client";

import { useActionState, useEffect, useState } from "react";
import { runDealImport, type DealImportState } from "@/app/actions/import-deals";
import { ErrorBanner } from "@/components/ui";

const empty: DealImportState = {};

export function CsvDealImportForm() {
  const [state, action, pending] = useActionState(runDealImport, empty);
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
        Same columns as Export deals. Existing contracts are matched by customer + supplier + start
        date (and MPAN/MPRN when present) and updated. Nothing is deleted. Preview before you import.
      </p>
      <input type="hidden" name="csv" value={csvText} />
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="field min-w-[16rem] flex-1">
          <span>Deals CSV</span>
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
          {pending ? "Importing…" : "Import deals"}
        </button>
      </div>

      {state.committed ? (
        <p className="mt-4 text-sm text-moss">
          Imported {state.committed.createDeals} new deal
          {state.committed.createDeals === 1 ? "" : "s"}, updated {state.committed.updateDeals}{" "}
          existing, {state.committed.createCustomers} new customer
          {state.committed.createCustomers === 1 ? "" : "s"}, {state.committed.createMeters} new
          meter{state.committed.createMeters === 1 ? "" : "s"}.
        </p>
      ) : null}

      {preview ? (
        <div className="mt-5 overflow-x-auto">
          <p className="mb-2 text-sm">
            Preview · {preview.createDeals} new deals · {preview.updateDeals} updates ·{" "}
            {preview.createCustomers} new customers · {preview.blocked} blocked
          </p>
          <table className="desk-table">
            <thead>
              <tr>
                <th>Line</th>
                <th>Company</th>
                <th>Supplier</th>
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
                  <td>
                    {row.supplier || "—"}
                    <div className="text-[0.7rem] text-muted">
                      {row.fuelType} · {row.status}
                    </div>
                  </td>
                  <td className="meter-id">
                    {row.mpan ? <div>E {row.mpan}</div> : null}
                    {row.mprn ? <div>G {row.mprn}</div> : null}
                    {!row.mpan && !row.mprn ? "—" : null}
                  </td>
                  <td>{row.action.replaceAll("_", " ")}</td>
                  <td className={row.errors.length ? "text-danger" : "text-muted"}>
                    {row.errors.join(" ") ||
                      (row.dealMatch ? `Update ${row.dealMatch}.` : "New deal.")}
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
