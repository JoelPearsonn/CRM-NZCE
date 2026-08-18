"use client";

import { useFormStatus } from "react-dom";
import { loadDemo } from "@/app/actions/demo";

function Submit({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Loading demo…" : "Load demo"}
    </button>
  );
}

export function LoadDemoButton({ className = "btn btn-brass w-full" }: { className?: string }) {
  return (
    <form action={loadDemo}>
      <Submit className={className} />
    </form>
  );
}
