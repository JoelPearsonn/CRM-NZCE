"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function stamp(root: HTMLElement) {
  root.querySelectorAll("table.desk-table").forEach((table) => {
    const headers = [...table.querySelectorAll("thead th")].map(
      (th) => th.textContent?.replace(/[↑↓]/g, "").replace(/\s+/g, " ").trim() ?? "",
    );
    table.querySelectorAll("tbody tr").forEach((tr) => {
      [...tr.children].forEach((cell, i) => {
        if (!(cell instanceof HTMLElement)) return;
        if (cell.dataset.label) return;
        if (cell.getAttribute("colspan")) return;
        cell.dataset.label = headers[i] ?? "";
      });
    });
  });
}

export function TableLabels({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    stamp(root);
    const observer = new MutationObserver(() => stamp(root));
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <div ref={ref} className="contents">
      {children}
    </div>
  );
}
