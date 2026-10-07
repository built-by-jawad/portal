// Single source of truth for page keys used by both the sidebar nav and the permission
// system (ProfilePermission.page, and the middleware route guard). Keep href prefixes unique
// and non-overlapping (e.g. don't add a page whose href is a prefix of another page's href).
export const PAGE_KEYS = [
  { key: "dashboard", href: "/", label: "Dashboard" },
  { key: "outreach", href: "/outreach", label: "Outreach" },
  { key: "leads", href: "/leads", label: "Leads" },
  { key: "engagement", href: "/engagement", label: "Engagement" },
  { key: "tasks", href: "/tasks", label: "Tasks" },
  { key: "prospects", href: "/prospects", label: "Prospects" },
  { key: "clients", href: "/clients", label: "Clients" },
  { key: "questions", href: "/questions", label: "Questions" },
  { key: "client-updates", href: "/client-updates", label: "Client Updates" },
  { key: "scripts", href: "/scripts", label: "Scripts" },
  { key: "ideas", href: "/ideas", label: "Ideas" },
  { key: "inbox", href: "/inbox", label: "Inbox" },
  { key: "expenses", href: "/expenses", label: "Expenses" },
  { key: "profiles", href: "/profiles", label: "Profiles" },
  { key: "settings", href: "/settings", label: "Settings" },
] as const;

export type PageKey = (typeof PAGE_KEYS)[number]["key"];

// Longest-href-match first so "/" (dashboard) never shadows a more specific page.
const BY_HREF_LENGTH = [...PAGE_KEYS].sort((a, b) => b.href.length - a.href.length);

export function pageKeyForPathname(pathname: string): PageKey | null {
  for (const p of BY_HREF_LENGTH) {
    if (p.href === "/" ? pathname === "/" : pathname === p.href || pathname.startsWith(p.href + "/")) {
      return p.key;
    }
  }
  return null;
}
