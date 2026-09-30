"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  const options = [
    { id: "light", label: "Claro" },
    { id: "dark", label: "Oscuro" },
    { id: "system", label: "Sistema" },
  ] as const;

  return (
    <div className="flex gap-1 rounded-xl border border-border p-1 text-sm">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setMode(opt.id)}
          className={`px-3 py-1 rounded-lg transition-colors ${
            mode === opt.id
              ? "bg-primary text-primaryFg"
              : "hover:bg-surface2 text-muted"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}