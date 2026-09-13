"use client";

// Triggers the browser's print dialog, which the client (or Jawad) can "Save as PDF" from —
// avoids pulling in a server-side PDF renderer for a low-volume, internal reporting need.
export default function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
    >
      Download as PDF
    </button>
  );
}
