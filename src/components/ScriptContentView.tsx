"use client";

import { useRef, useState } from "react";

// Renders a script's rich-text HTML content with a copy icon in the top-right corner, matching
// CopyBox's affordance elsewhere in the app — copies the plain-text version (formatting stripped)
// since that's what's useful when pasting into an email, DM, or teleprompter.
export default function ScriptContentView({ html }: { html: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = contentRef.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — content is still visible to select manually
    }
  }

  return (
    <div className="relative rounded-xl border border-mist/30 bg-white/60 shadow-sm">
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy to clipboard"
        title="Copy to clipboard"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md bg-ink/90 text-paper transition hover:bg-ink"
      >
        {copied ? "✓" : "⧉"}
      </button>
      <div
        ref={contentRef}
        className="prose prose-sm max-w-none p-4 sm:p-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
