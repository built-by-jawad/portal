"use client";

import { useState } from "react";
import { addEngagementProfilesManual } from "@/lib/actions";
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_LABELS, type SocialPlatform } from "@/lib/constants";

export default function NewEngagementProfileForm() {
  const [checkedPlatforms, setCheckedPlatforms] = useState<Set<SocialPlatform>>(new Set());

  function toggle(platform: SocialPlatform) {
    setCheckedPlatforms((prev) => {
      const next = new Set(prev);
      next.has(platform) ? next.delete(platform) : next.add(platform);
      return next;
    });
  }

  return (
    <form action={addEngagementProfilesManual} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Business name</label>
        <input
          type="text"
          name="businessName"
          required
          className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Preferred time (optional)</label>
        <input
          type="text"
          name="time"
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
                placeholder="Profile link"
                disabled={!checkedPlatforms.has(platform)}
                className="flex-1 rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink focus:border-green focus:outline-none disabled:bg-mist/10 disabled:text-slate"
              />
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate">
          Each checked platform starts its own 7-day checklist (Follow → Like → Comment → Like → Comment → Like → Comment).
        </p>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
      >
        Add business
      </button>
    </form>
  );
}
