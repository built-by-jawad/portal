"use client";

// Client dropdown on /client-updates — auto-navigates on change, preserving the current view/anchor.
export default function ClientFilterSelect({
  clients,
  value,
  view,
  anchor,
}: {
  clients: { id: string; businessName: string }[];
  value: string;
  view: string;
  anchor?: string;
}) {
  return (
    <form action="/client-updates" method="get" className="contents">
      <input type="hidden" name="view" value={view} />
      {anchor && <input type="hidden" name="anchor" value={anchor} />}
      <select
        name="leadId"
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none"
      >
        <option value="">All clients</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.businessName}
          </option>
        ))}
      </select>
    </form>
  );
}
