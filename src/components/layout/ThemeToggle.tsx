import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const opts = [
    { key: "light", icon: <Sun size={15} /> },
    { key: "dark", icon: <Moon size={15} /> },
    { key: "system", icon: <Monitor size={15} /> },
  ] as const;
  return (
    <div className="inline-flex rounded-[10px] border border-[var(--color-border)] p-0.5">
      {opts.map((o) => (
        <button key={o.key} onClick={() => setTheme(o.key)} aria-label={`${o.key} theme`}
          className="flex h-7 w-7 items-center justify-center rounded-[8px] transition-colors"
          style={{
            background: theme === o.key ? "var(--color-primary)" : "transparent",
            color: theme === o.key ? "#fff" : "var(--color-text-secondary)",
          }}>
          {o.icon}
        </button>
      ))}
    </div>
  );
}
