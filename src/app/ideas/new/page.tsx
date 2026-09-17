import PageHeader from "@/components/PageHeader";
import IdeaEditor from "@/components/IdeaEditor";

export default function NewIdeaPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Add Idea" description="Jot it down before it slips your mind — saves automatically as you type." />

      <div className="rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
        <IdeaEditor />
      </div>
    </div>
  );
}
