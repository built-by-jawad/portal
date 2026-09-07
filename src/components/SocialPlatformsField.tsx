"use client";

import { useState } from "react";
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_LABELS } from "@/lib/constants";

// Which platforms a lead is active on. Checking one here (and saving) seeds a 7-day engagement
// checklist for it — see EngagementDay in the schema and /engagement for where that shows up.
export default function SocialPlatformsField({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);

  function toggle(platform: string) {
    setSelected((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  }

  return (
    <div className="sm:col-span-2">
      <label className="mb-1.5 block text-sm font-medium text-ink">Active on</label>
      <div className="flex flex-wrap gap-3">
        {SOCIAL_PLATFORMS.map((platform) => (
          <label
            key={platform}
            className="flex items-center gap-2 rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm text-ink"
          >
            <input
              type="checkbox"
              name="socialPlatforms"
              value={platform}
              checked={selected.includes(platform)}
              onChange={() => toggle(platform)}
              className="h-4 w-4 rounded border-mist/40 accent-green"
            />
            {SOCIAL_PLATFORM_LABELS[platform]}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-slate">
        Checking a platform starts a 7-day engagement checklist for it (see the Engagement page).
      </p>
    </div>
  );
}
