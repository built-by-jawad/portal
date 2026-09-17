import PageHeader from "@/components/PageHeader";
import RichTextEditor from "@/components/RichTextEditor";
import { createIdea } from "@/lib/actions";

export default function NewIdeaPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Add Idea" description="Jot it down before it slips your mind." />

      <form action={createIdea} className="space-y-4 rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Idea <span className="text-green">*</span>
          </label>
          <RichTextEditor />
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
        >
          Save Idea
        </button>
      </form>
    </div>
  );
}
