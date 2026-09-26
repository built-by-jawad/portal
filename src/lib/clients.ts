import { prisma } from "@/lib/prisma";

function slugify(name: string) {
  return name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "client";
}

// Clients are BOOKED leads. Their URL is the business name slug; duplicates get -2, -3 by age.
export async function clientSlugMap() {
  const clients = await prisma.lead.findMany({
    where: { status: "BOOKED" },
    orderBy: { createdAt: "asc" },
    select: { id: true, businessName: true },
  });
  const used = new Map<string, number>();
  const idToSlug = new Map<string, string>();
  const slugToId = new Map<string, string>();
  for (const c of clients) {
    const base = slugify(c.businessName);
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const slug = n === 1 ? base : `${base}-${n}`;
    idToSlug.set(c.id, slug);
    slugToId.set(slug, c.id);
  }
  return { idToSlug, slugToId };
}

export async function clientPath(id: string) {
  const { idToSlug } = await clientSlugMap();
  return `/clients/${idToSlug.get(id) ?? id}`;
}
