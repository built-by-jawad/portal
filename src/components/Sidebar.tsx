"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "◧" },
  { href: "/today", label: "Today's Outreach", icon: "◷" },
  { href: "/leads", label: "Leads", icon: "☰" },
  { href: "/inbox", label: "Inbox", icon: "✉" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-ink px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <img
            src="/brand/builtbyjawad-wordmark-light.svg"
            alt="builtbyjawad"
            width={140}
            height={24}
          />
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-mist"
        >
          <span className="text-2xl leading-none">{open ? "×" : "☰"}</span>
        </button>
      </div>

      <aside
        className={`${
          open ? "flex" : "hidden"
        } md:flex w-full md:w-64 shrink-0 flex-col bg-ink px-4 py-6 md:min-h-screen`}
      >
        <Link
          href="/"
          className="mb-8 hidden items-center gap-2 md:flex"
          onClick={() => setOpen(false)}
        >
          <img
            src="/brand/builtbyjawad-wordmark-light.svg"
            alt="builtbyjawad"
            width={170}
            height={30}
          />
        </Link>

        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-widest text-slate">
          Outreach Portal
        </p>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-green/15 text-green"
                  : "text-mist hover:bg-white/5 hover:text-paper"
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto hidden pt-8 md:block">
          <p className="text-xs text-slate">Found. Chosen. Booked.</p>
        </div>
      </aside>
    </>
  );
}
