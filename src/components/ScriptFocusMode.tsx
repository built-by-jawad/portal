"use client";

import { useEffect, useState } from "react";

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 56;
const DEFAULT_FONT_SIZE = 20;

// Full-screen distraction-free reading view for a script: hides all site chrome, supports
// bumping font size for readability, and lets you isolate a selected portion of the text
// (teleprompter-style) so only that snippet shows.
export default function ScriptFocusMode({ html }: { html: string }) {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [selectedText, setSelectedText] = useState("");
  const [isolatedText, setIsolatedText] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleSelectionChange() {
      const text = window.getSelection()?.toString().trim() ?? "";
      setSelectedText(text);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  function close() {
    setOpen(false);
    setIsolatedText(null);
    setSelectedText("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
      >
        Focus Mode
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-paper">
          <div className="flex items-center justify-end gap-2 border-b border-mist/20 px-4 py-2">
            {isolatedText ? (
              <button
                type="button"
                onClick={() => setIsolatedText(null)}
                className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
              >
                Show full script
              </button>
            ) : (
              selectedText && (
                <button
                  type="button"
                  onClick={() => setIsolatedText(selectedText)}
                  className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist/10"
                >
                  Isolate selection
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(MIN_FONT_SIZE, s - 2))}
              aria-label="Decrease font size"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-mist/40 text-sm font-semibold text-ink transition hover:bg-mist/10"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(MAX_FONT_SIZE, s + 2))}
              aria-label="Increase font size"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-mist/40 text-sm font-semibold text-ink transition hover:bg-mist/10"
            >
              A+
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Close focus mode"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-mist/40 text-sm font-semibold text-ink transition hover:bg-mist/10"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-10">
              {isolatedText ? (
                <p style={{ fontSize, whiteSpace: "pre-wrap" }} className="text-ink">
                  {isolatedText}
                </p>
              ) : (
                <div
                  style={{ fontSize }}
                  className="prose max-w-none text-ink"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
