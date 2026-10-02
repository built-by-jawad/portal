"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEngagementBusinesses } from "@/lib/actions";
import { useToast } from "@/components/ToastProvider";
import { SOCIAL_PLATFORM_LABELS, type SocialPlatform } from "@/lib/constants";
import EngagementBusinessEditForm from "@/components/EngagementBusinessEditForm";

export type BusinessGroup = {
  groupKey: string;
  businessName: string;
  time: string | null;
  platforms: { platform: SocialPlatform; profileUrl: string; done: number; total: number }[];
};

// One card per business (not per platform). Select one or more, then Edit (single only) or
// Delete from the bulk bar — same card the business was added from, so editing just
// re-opens its platform checklist for adding/removing specific platforms.
export default function BusinessWarmupSection({ groups }: { groups: BusinessGroup[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const notify = useToast();
  const router = useRouter();

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const ids = Array.from(selected);

  return (
    <div className="space-y-2">
      {groups.map((g) => {
        const isEditing = editingKey === g.groupKey;
        return (
          <div key={g.groupKey} className="rounded-lg border border-mist/30 bg-white/60 px-3 py-2.5">
            {isEditing ? (
              <EngagementBusinessEditForm
                groupKey={g.groupKey}
                businessName={g.businessName}
                time={g.time}
                platformUrls={Object.fromEntries(g.platforms.map((p) => [p.platform, p.profileUrl]))}
                onCancel={() => setEditingKey(null)}
              />
            ) : (
              <div className="flex items-center justify-between gap-3">
                <label className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(g.groupKey)}
                    onChange={() => toggle(g.groupKey)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-mist/40 accent-green"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-ink">{g.businessName}</span>
                    <span className="ml-2 text-xs text-slate">
                      {g.platforms
                        .map(
                          (p) =>
                            `${SOCIAL_PLATFORM_LABELS[p.platform] ?? p.platform} ${p.done}/${p.total}`
                        )
                        .join(" · ")}
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>
        );
      })}

      {ids.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-mist/30 bg-white p-3 shadow-lg">
          <span className="text-xs font-semibold text-ink">
            {ids.length} selected
          </span>
          {ids.length === 1 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setEditingKey(ids[0]);
                setSelected(new Set());
              }}
              className="rounded-lg border border-mist/40 px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Remove ${ids.length} business${ids.length === 1 ? "" : "es"} and all their checklists?`))
                return;
              startTransition(async () => {
                try {
                  await deleteEngagementBusinesses(ids);
                  notify("Removed");
                  setSelected(new Set());
                  router.refresh();
                } catch {
                  notify("Something went wrong");
                }
              });
            }}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-slate hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}
