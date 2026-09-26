import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clientSlugMap } from "@/lib/clients";
import LeadDetail, { loadLeadShared } from "@/components/LeadDetail";

// The [id] segment is the business-name slug. Old raw-id links redirect to the slug.
export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: param } = await params;
  const shared = loadLeadShared();
  const { idToSlug, slugToId } = await clientSlugMap();
  const id = slugToId.get(param);
  if (id) return <LeadDetail params={Promise.resolve({ id })} shared={shared} />;

  const lead = await prisma.lead.findUnique({ where: { id: param }, select: { status: true } });
  if (!lead) notFound();
  if (lead.status !== "BOOKED") redirect(`/leads/${param}`);
  redirect(`/clients/${idToSlug.get(param) ?? param}`);
}
