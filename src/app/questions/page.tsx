import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import ClientQuestions from "@/components/ClientQuestions";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const [clients, questions] = await Promise.all([
    prisma.lead.findMany({
      where: { status: "BOOKED" },
      orderBy: { businessName: "asc" },
      select: { id: true, businessName: true },
    }),
    prisma.clientQuestion.findMany({
      orderBy: { createdAt: "desc" },
      relationLoadStrategy: "join",
      include: { lead: { select: { businessName: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Questions to ask"
        description="Things to ask your clients, all in one place. Add one whenever it comes to mind."
      />
      <ClientQuestions
        clients={clients}
        questions={questions.map((q) => ({ ...q, clientName: q.lead.businessName }))}
      />
    </div>
  );
}
