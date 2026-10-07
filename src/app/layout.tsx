import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AppShell from "@/components/AppShell";
import ToastProvider from "@/components/ToastProvider";
import { getCurrentProfile, canView } from "@/lib/auth";
import { PAGE_KEYS } from "@/lib/permissions";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "builtbyjawad — Outreach Portal",
  description: "Internal outreach portal for builtbyjawad — leads, initial emails, and follow-ups.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();
  const visibleHrefs = profile
    ? profile.isAdmin
      ? null
      : PAGE_KEYS.filter((p) => canView(profile, p.key)).map((p) => p.href)
    : [];

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">{`try{var t=localStorage.getItem("theme")||"system";if(t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`}</Script>
        <ToastProvider>
          <AppShell visibleHrefs={visibleHrefs} profileName={profile?.name} profileImageUrl={profile?.imageUrl}>
            {children}
          </AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
