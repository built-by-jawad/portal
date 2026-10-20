import LeadDetailFull from "@/components/LeadDetailFull";

export default async function LeadFullDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <LeadDetailFull params={params} />;
}
