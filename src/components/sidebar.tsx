"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DeskLink } from "@/components/desk-link";

const links = [
  { href: "/", label: "Desk", hint: "Today on the book" },
  { href: "/renewals", label: "Renewals", hint: "30 / 60 / 90 · diary" },
  { href: "/tasks", label: "Tasks", hint: "Follow-ups inbox" },
  { href: "/customers", label: "Customers", hint: "Sites & contacts" },
  { href: "/leads", label: "Leads", hint: "Pipeline" },
  { href: "/contracts", label: "Contracts", hint: "Sold book" },
  { href: "/finance", label: "Finance", hint: "Cashflow & profit" },
  { href: "/agents", label: "Agents", hint: "Allocation" },
  { href: "/help", label: "How to use", hint: "Plain English" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <>
      {links.map((link) => {
        const shown = pendingHref ?? pathname;
        const active = link.href === "/" ? shown === "/" : shown.startsWith(link.href);
        const pending = pendingHref === link.href;
        return (
          <DeskLink
            key={link.href}
            href={link.href}
            intentDelayMs={0}
            onClick={() => {
              if (link.href !== pathname) setPendingHref(link.href);
              onNavigate?.();
            }}
            className={`flex min-h-11 flex-col justify-center rounded-sm px-3 py-2.5 ${
              active
                ? "bg-ink-3 text-gold-soft shadow-[inset_3px_0_0_#c9a46a]"
                : "text-[#d8d2c4] hover:bg-white/5 hover:text-gold-soft"
            } ${pending ? "nav-link-pending" : ""}`}
          >
            <div className="text-sm font-semibold">{link.label}</div>
            <div className="text-[0.7rem] text-[#8f9a93]">{link.hint}</div>
          </DeskLink>
        );
      })}
    </>
  );
}

function Brand() {
  return (
    <div className="border-b border-white/10 px-5 py-5">
      <p className="font-sans text-[1.45rem] leading-none tracking-tight text-gold-soft">NZCE</p>
      <p className="mt-1 text-[0.68rem] font-semibold tracking-[0.16em] text-gold uppercase">
        Brokerage desk
      </p>
    </div>
  );
}

function Foot() {
  return (
    <div className="border-t border-white/10 px-5 py-4 text-[0.7rem] leading-5 text-[#8f9a93]">
      UK energy brokerage
      <br />
      Meters · MPAN · renewal
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-navy text-gold-soft md:flex">
      <Brand />
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        <NavLinks />
      </nav>
      <Foot />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="nav-toggle md:hidden"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/50"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-[min(18rem,86vw)] flex-col bg-navy text-gold-soft shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
              <div>
                <p className="font-sans text-[1.45rem] leading-none tracking-tight text-gold-soft">NZCE</p>
                <p className="mt-1 text-[0.68rem] font-semibold tracking-[0.16em] text-gold uppercase">
                  Brokerage desk
                </p>
              </div>
              <button
                type="button"
                className="nav-toggle nav-toggle-close"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
              <NavLinks onNavigate={() => setOpen(false)} />
            </nav>
            <Foot />
          </aside>
        </div>
      ) : null}
    </>
  );
}
