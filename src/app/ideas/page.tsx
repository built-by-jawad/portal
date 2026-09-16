import PageHeader from "@/components/PageHeader";
import IdeasList from "@/components/IdeasList";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const ideas = await prisma.idea.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Ideas" description="A running scratchpad for anything worth revisiting later." />
      <IdeasList ideas={ideas} />
    </div>
  );
}
