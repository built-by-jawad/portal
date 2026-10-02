"use client";

import { useState } from "react";
import { updateEngagementBusiness } from "@/lib/actions";
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_LABELS, type SocialPlatform } from "@/lib/constants";

type Props = {
  groupKey: string;
  businessName: string;
  time: string | null;
  platformUrls: Partial<Record<SocialPlatform, string>>;
  onCancel: () => void;
};

// Mirrors the "add business" form but prefilled: unchecking a platform here removes that
// profile (and its days) on save, checking a new one adds and seeds it.
export default function EngagementBusinessEditForm({ groupKey, businessName, time, platformUrls, onCancel }: Props) {
  const [checkedPlatforms, setCheckedPlatforms] = useState<Set<SocialPlatform>>(
    new Set(Object.keys(platformUrls) as SocialPlatform[])
  );

  function toggle(platform: SocialPlatform) {
    setCheckedPlatforms((prev) => {
      const next = new Set(prev);
      next.has(platform) ? next.delete(platform) : next.add(platform);
      return next;
    });
  }

  return (
    <form action={updateEngagementBusiness} className="space-y-4 rounded-lg border border-mist/30 bg-mist/5 p-4">
      <input type="hidden" name="groupKey" value={groupKey} />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Business name</label>
        <input
          type="text"
          name="businessName"
          defaultValue={businessName}
          required
          className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Preferred time (optional)</label>
        <input
          type="text"
          name="time"
          defaultValue={time ?? ""}
          placeholder="e.g. 9:00 AM"
          className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Active profiles</label>
        <div className="space-y-2">
          {SOCIAL_PLATFORMS.map((platform) => (
            <div key={platform} className="flex items-center gap-2">
              <label className="flex w-32 shrink-0 items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  name={`platform_${platform}`}
                  checked={checkedPlatforms.has(platform)}
                  onChange={() => toggle(platform)}
                  className="h-4 w-4 rounded border-mist/40 accent-green"
                />
                {SOCIAL_PLATFORM_LABELS[platform]}
              </label>
              <input
                type="url"
                name={`url_${platform}`}
                defaultValue={platformUrls[platform] ?? ""}
                placeholder="Profile link"
                disabled={!checkedPlatforms.has(platform)}
                className="flex-1 rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none disabled:bg-mist/10 disabled:text-slate"
              />
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate">
          Unchecking a platform removes it and its checklist. Checking a new one starts a fresh 7-day checklist for it.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-paper transition hover:brightness-95"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-mist/40 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-mist/10"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
