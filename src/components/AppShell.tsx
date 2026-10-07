"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AddFab from "@/components/AddFab";

export default function AppShell({
  children,
  visibleHrefs,
  profileName,
  profileImageUrl,
}: {
  children: React.ReactNode;
  visibleHrefs: string[] | null;
  profileName?: string;
  profileImageUrl?: string | null;
}) {
  const pathname = usePathname();
  const isBare = pathname === "/login";

  if (isBare) return <main className="flex-1 min-w-0">{children}</main>;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar visibleHrefs={visibleHrefs} profileName={profileName} profileImageUrl={profileImageUrl} />
      <main className="flex-1 min-w-0">{children}</main>
      <AddFab />
    </div>
  );
}
