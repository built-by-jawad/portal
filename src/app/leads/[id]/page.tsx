import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clientPath } from "@/lib/clients";
import LeadDetail, { loadLeadShared } from "@/components/LeadDetail";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shared = loadLeadShared();
  const lead = await prisma.lead.findUnique({ where: { id }, select: { status: true } });
  if (lead?.status === "BOOKED") redirect(await clientPath(id));
  return <LeadDetail params={params} shared={shared} />;
}
