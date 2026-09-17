"use client";

import { useEffect, useRef, useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import { autosaveIdea, createIdeaDraft } from "@/lib/actions";

const AUTOSAVE_DELAY_MS = 800;

// Autosaves an idea while typing, no manual save button. On a brand-new idea (ideaId is null),
// the record itself isn't created until there's actually something to save (first non-empty
// debounced tick) — that first save also silently swaps the URL to the idea's real edit page via
// history.replaceState, so refreshing keeps working without ever navigating away from under the user.
export default function IdeaEditor({
  ideaId: initialIdeaId,
  initialContent = "",
}: {
  ideaId?: string;
  initialContent?: string;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const ideaIdRef = useRef(initialIdeaId);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef(initialContent);
  const saveTokenRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        void save(latestContentRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(content: string) {
    latestContentRef.current = content;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void save(content), AUTOSAVE_DELAY_MS);
  }

  async function save(content: string) {
    const isEmpty = !content.trim() || content.trim() === "<p></p>";
    if (isEmpty) return;

    const token = ++saveTokenRef.current;
    setStatus("saving");

    if (ideaIdRef.current) {
      await autosaveIdea(ideaIdRef.current, content);
    } else {
      const id = await createIdeaDraft(content);
      ideaIdRef.current = id;
      window.history.replaceState(null, "", `/ideas/${id}/edit`);
    }

    if (token === saveTokenRef.current && latestContentRef.current === content) {
      setStatus("saved");
    }
  }

  return (
    <div>
      <RichTextEditor initialContent={initialContent} placeholder="What's the idea?" onChange={handleChange} />
      <p className="mt-2 text-xs text-slate">
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : " "}
      </p>
    </div>
  );
}
