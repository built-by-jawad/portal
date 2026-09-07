"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Floating "+" button, fixed bottom-right on every page. Clicking it toggles a small menu with
// Add Lead / Add Task instead of linking straight to one — replaces the old single-purpose
// "Add Lead" floating button now that there's a second thing to create.
export default function AddFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  if (pathname === "/leads/new" || pathname === "/tasks/new") return null;

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col gap-2">
          <Link
            href="/tasks/new"
            className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper shadow-lg transition hover:brightness-110"
          >
            + Add Task
          </Link>
          <Link
            href="/leads/new"
            className="flex items-center gap-2 rounded-full bg-green px-4 py-2.5 text-sm font-semibold text-paper shadow-lg transition hover:brightness-95"
          >
            + Add Lead
          </Link>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close add menu" : "Add"}
        title="Add"
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-green text-2xl font-bold text-paper shadow-lg transition hover:brightness-95 active:scale-95 ${
          open ? "rotate-45" : ""
        }`}
      >
        +
      </button>
    </div>
  );
}
