import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-muted uppercase">Not on the desk</p>
      <h1 className="mt-2 font-serif text-3xl">That record is not here</h1>
      <p className="mt-2 text-sm text-muted">It may have been removed, or the link is stale.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Back to the desk
      </Link>
    </div>
  );
}
