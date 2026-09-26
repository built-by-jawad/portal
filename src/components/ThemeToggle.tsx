"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "theme";
const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀" },
  { value: "dark", label: "Dark", icon: "☾" },
  { value: "system", label: "System", icon: "◐" },
];

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export default function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as Theme | null) ?? "system";
    setTheme(saved);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply((localStorage.getItem(KEY) as Theme | null) ?? "system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    localStorage.setItem(KEY, next);
    apply(next);
  }

  if (collapsed) {
    const i = OPTIONS.findIndex((o) => o.value === theme);
    const next = OPTIONS[(i + 1) % OPTIONS.length];
    return (
      <button
        type="button"
        onClick={() => choose(next.value)}
        title={`Theme: ${OPTIONS[i].label} (click for ${next.label})`}
        className="mt-4 flex w-full items-center justify-center rounded-lg py-2 text-mist hover:bg-white/5"
      >
        {OPTIONS[i].icon}
      </button>
    );
  }

  return (
    <div className="mt-4 flex gap-1 rounded-lg bg-white/5 p-1" role="group" aria-label="Theme">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => choose(o.value)}
          aria-pressed={theme === o.value}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${
            theme === o.value ? "bg-green/20 text-green" : "text-mist hover:text-[#f7f5f0]"
          }`}
        >
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  );
}
