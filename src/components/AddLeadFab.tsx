"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Floating "+ Add Lead" button, fixed bottom-right on every page — replaces the old inline
// "Add Lead" buttons that used to live in the sidebar, dashboard, and leads list header.
export default function AddLeadFab() {
  const pathname = usePathname();
  if (pathname === "/leads/new") return null;

  return (
    <Link
      href="/leads/new"
      aria-label="Add lead"
      title="Add lead"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green text-2xl font-bold text-paper shadow-lg transition hover:brightness-95 active:scale-95"
    >
      +
    </Link>
  );
}
