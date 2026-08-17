"use client";

import { runDealImport, type DealImportState } from "@/app/actions/import-deals";
import { ErrorBanner } from "@/components/ui";
import { useImportAction } from "@/components/use-csv-import";
import { gbpExact } from "@/lib/format";

const empty: DealImportState = {};

export function CsvDealImportForm() {
  const { csvText, fileName, onFileChange, onPasteText, state, pending, canCommit, submit } = useImportAction(
    runDealImport,
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
        Same columns as Export deals. TPI uses the same calculator as Record deal: net is full deal
        value minus TPI % (Joose + UCR 30, Joose 25, Infinite 20, none 0). Payment 1 / 2 / 3 and
        expected dates are stored when those columns are present; otherwise amounts come from the
        split percents. Actual commission is one received pair for the deal. Existing contracts are
        matched by customer + supplier + start date (and MPAN/MPRN when present) and updated. Nothing
        is deleted. Preview before you import.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="field min-w-[16rem] flex-1">
          <span>Deals CSV</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onInput={(event) => void onFileChange(event.currentTarget.files?.[0])}
            onChange={(event) => void onFileChange(event.currentTarget.files?.[0])}
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
          {pending ? "Importing…" : "Import deals"}
        </button>
      </div>
      <label className="field mt-3">
        <span>Or paste the CSV</span>
        <textarea
          rows={4}
          value={csvText}
          onChange={(event) => onPasteText(event.target.value)}
          placeholder="Paste the deals template here if the file picker does not stick."
        />
      </label>

      {state.committed ? (
        <p className="mt-4 text-sm text-moss" data-testid="deal-import-committed">
          Imported {state.committed.createDeals} new deal
          {state.committed.createDeals === 1 ? "" : "s"}, updated {state.committed.updateDeals}{" "}
          existing, {state.committed.createCustomers} new customer
          {state.committed.createCustomers === 1 ? "" : "s"}, {state.committed.createMeters} new
          meter{state.committed.createMeters === 1 ? "" : "s"}.
        </p>
      ) : null}

      {preview ? (
        <div className="mt-5 overflow-x-auto" data-testid="deal-import-preview">
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
                <th>TPI / payout</th>
                <th>Net / due</th>
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
                  <td>
                    {row.tpiLabel ?? "—"}
                    <div className="text-[0.7rem] text-muted">{row.payoutLabel ?? ""}</div>
                  </td>
                  <td>
                    {row.net != null ? gbpExact(row.net) : "—"}
                    <div className="text-[0.7rem] text-muted">
                      {row.amountDue != null ? `Due ${gbpExact(row.amountDue)}` : ""}
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
