import Link from "next/link";
import { LoadDemoButton } from "@/components/load-demo-button";

export function StartBook() {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <p className="mb-1 text-[0.68rem] font-semibold tracking-[0.14em] text-muted uppercase">
        First run
      </p>
      <h1 className="font-serif text-3xl leading-none tracking-tight text-ink">The book is empty</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Add a customer, import a CSV, or load the demo book. The demo is optional — you can start
        with a real list.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link href="/customers/new" className="btn btn-primary">
          Add customer
        </Link>
        <Link href="/import" className="btn btn-ghost">
          Import CSV
        </Link>
        <LoadDemoButton />
      </div>
    </div>
  );
}
