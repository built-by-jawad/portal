"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "◧" },
  { href: "/outreach", label: "Outreach", icon: "☰" },
  { href: "/tasks", label: "Tasks", icon: "◫" },
  { href: "/prospects", label: "Prospects", icon: "▦" },
  { href: "/clients", label: "Clients", icon: "◆" },
  { href: "/questions", label: "Questions", icon: "?" },
  { href: "/client-updates", label: "Client Updates", icon: "✎" },
  { href: "/scripts", label: "Scripts", icon: "▤" },
  { href: "/ideas", label: "Ideas", icon: "✦" },
  { href: "/inbox", label: "Inbox", icon: "✉" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

const COLLAPSE_KEY = "sidebar-collapsed";

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read the saved collapse state after mount so server and first client render match (avoids
  // hydration mismatch) — the sidebar briefly renders expanded, then snaps to the saved state.
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "true");
    setHydrated(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/outreach" && pathname.startsWith("/leads"));

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-sidebar px-4 py-3 md:hidden print:hidden">
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
        className={`${open ? "flex" : "hidden"} md:flex ${
          collapsed ? "md:w-16" : "md:w-64"
        } relative w-full shrink-0 flex-col bg-sidebar px-4 py-6 md:min-h-screen print:hidden ${
          hydrated ? "transition-[width] duration-150" : ""
        }`}
      >
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-8 hidden h-6 w-6 items-center justify-center rounded-full border border-mist/30 bg-sidebar text-xs text-mist transition hover:text-[#f7f5f0] md:flex"
        >
          {collapsed ? "›" : "‹"}
        </button>

        <Link
          href="/"
          className={`mb-8 hidden items-center gap-2 md:flex ${collapsed ? "justify-center" : ""}`}
          onClick={() => setOpen(false)}
        >
          {collapsed ? (
            <span className="font-display text-xl font-bold text-[#f7f5f0]">b.</span>
          ) : (
            <img
              src="/brand/builtbyjawad-wordmark-light.svg"
              alt="builtbyjawad"
              width={170}
              height={30}
            />
          )}
        </Link>

        {!collapsed && (
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-widest text-slate">
            Outreach Portal
          </p>
        )}

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                isActive(item.href)
                  ? "bg-green/15 text-green"
                  : "text-mist hover:bg-white/5 hover:text-[#f7f5f0]"
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {!collapsed && item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
          <ThemeToggle collapsed={collapsed} />
          {!collapsed && (
            <p className="mt-4 hidden text-xs text-slate md:block">Found. Chosen. Booked.</p>
          )}
        </div>
      </aside>
    </>
  );
}
