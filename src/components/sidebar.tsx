"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Desk", hint: "Today on the book" },
  { href: "/renewals", label: "Renewals", hint: "30 / 60 / 90 days" },
  { href: "/tasks", label: "Tasks", hint: "Follow-ups inbox" },
  { href: "/customers", label: "Customers", hint: "Sites & contacts" },
  { href: "/leads", label: "Leads", hint: "Pipeline" },
  { href: "/contracts", label: "Contracts", hint: "Sold book" },
  { href: "/finance", label: "Finance", hint: "Cashflow & profit" },
  { href: "/agents", label: "Agents", hint: "Allocation" },
  { href: "/help", label: "How to use", hint: "Plain English" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-ink text-[#e8e2d4]">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="font-serif text-[1.65rem] leading-none tracking-tight text-[#f4e7c3]">
          NZCE
        </p>
        <p className="mt-1 text-[0.68rem] font-semibold tracking-[0.16em] text-brass uppercase">
          Brokerage desk
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-sm px-3 py-2.5 ${
                active
                  ? "bg-ink-3 text-[#f4e7c3] shadow-[inset_3px_0_0_#c4922a]"
                  : "text-[#c9c2b2] hover:bg-white/5 hover:text-[#f3eee3]"
              }`}
            >
              <div className="text-sm font-semibold">{link.label}</div>
              <div className="text-[0.7rem] text-[#8f9a93]">{link.hint}</div>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-[0.7rem] leading-5 text-[#8f9a93]">
        UK energy brokerage
        <br />
        Meters · MPAN · renewal
      </div>
    </aside>
  );
}
