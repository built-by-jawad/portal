"use client";

import { useState } from "react";

// A code-snippet-style box with a copy icon in the top-right corner, for pasting a subject/body
// straight into Gmail (or wherever) without selecting text by hand.
export default function CopyBox({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — silently no-op, the text is still visible to select manually
    }
  }

  return (
    <div>
      {label && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate">{label}</p>}
      <div className="relative rounded-lg border border-mist/40 bg-ink/95">
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy to clipboard"
          title="Copy to clipboard"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-paper transition hover:bg-white/20"
        >
          {copied ? "✓" : "⧉"}
        </button>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words px-3 py-3 pr-11 font-mono text-xs text-paper">
          {text || "—"}
        </pre>
      </div>
    </div>
  );
}
