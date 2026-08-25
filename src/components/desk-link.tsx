"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type ComponentProps } from "react";

type DeskLinkProps = ComponentProps<typeof Link> & {
  /** Wait this long after hover/focus before prefetching the full route. */
  intentDelayMs?: number;
};

function hrefOf(href: DeskLinkProps["href"]) {
  if (typeof href === "string") return href;
  const pathname = href.pathname ?? "";
  const search = href.search ?? "";
  const hash = href.hash ?? "";
  return `${pathname}${search}${hash}`;
}

export function DeskLink({
  href,
  prefetch,
  intentDelayMs = 80,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}: DeskLinkProps) {
  const router = useRouter();
  const timer = useRef<number>(0);
  const target = hrefOf(href);

  function cancelHint() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = 0;
  }

  function hint() {
    if (prefetch === false || !target) return;
    cancelHint();
    timer.current = window.setTimeout(() => {
      router.prefetch(target);
    }, intentDelayMs);
  }

  return (
    <Link
      href={href}
      prefetch={prefetch ?? null}
      onMouseEnter={(event) => {
        hint();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        hint();
        onFocus?.(event);
      }}
      onMouseLeave={(event) => {
        cancelHint();
        onMouseLeave?.(event);
      }}
      onBlur={(event) => {
        cancelHint();
        onBlur?.(event);
      }}
      {...props}
    />
  );
}
