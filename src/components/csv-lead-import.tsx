"use client";

import { runLeadImport, type LeadImportState } from "@/app/actions/import-leads";
import { ErrorBanner } from "@/components/ui";
import { useImportAction } from "@/components/use-csv-import";

const empty: LeadImportState = {};

export function CsvLeadImportForm() {
  const { csvText, fileName, onFileChange, state, pending, canCommit, submit } = useImportAction(
    runLeadImport,
    empty,
  );
  const preview = state.preview;

  return (
    <form
      className="card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit("preview");
      }}
    >
      <ErrorBanner message={state.error} />
      <p className="text-sm text-muted">
        Same columns as Export leads. Existing leads are matched by customer + title and updated.
        Nothing is deleted. Preview before you import.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="field min-w-[16rem] flex-1">
          <span>Leads CSV</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void onFileChange(event.target.files?.[0])}
          />
          {fileName ? <span className="text-[0.7rem] text-muted">{fileName}</span> : null}
        </label>
        <button className="btn btn-ghost" type="submit" disabled={pending || !csvText}>
          {pending ? "Reading…" : "Preview"}
        </button>
        <button
          className="btn btn-primary"
          type="button"
          disabled={pending || !canCommit}
          onClick={() => void submit("commit")}
        >
          {pending ? "Importing…" : "Import leads"}
        </button>
      </div>

      {state.committed ? (
        <p className="mt-4 text-sm text-moss" data-testid="lead-import-committed">
          Imported {state.committed.createLeads} new lead
          {state.committed.createLeads === 1 ? "" : "s"}, updated {state.committed.updateLeads}{" "}
          existing, {state.committed.createCustomers} new customer
          {state.committed.createCustomers === 1 ? "" : "s"}.
        </p>
      ) : null}

      {preview ? (
        <div className="mt-5 overflow-x-auto" data-testid="lead-import-preview">
          <p className="mb-2 text-sm">
            Preview · {preview.createLeads} new leads · {preview.updateLeads} updates ·{" "}
            {preview.createCustomers} new customers · {preview.blocked} blocked
          </p>
          <table className="desk-table">
            <thead>
              <tr>
                <th>Line</th>
                <th>Company</th>
                <th>Lead</th>
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
                    {row.title || "—"}
                    <div className="text-[0.7rem] text-muted">{row.stage}</div>
                  </td>
                  <td>{row.action.replaceAll("_", " ")}</td>
                  <td className={row.errors.length ? "text-danger" : "text-muted"}>
                    {row.errors.join(" ") ||
                      (row.leadMatch ? `Update ${row.leadMatch}.` : "New lead.")}
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
