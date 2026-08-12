import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark" | "system";
interface ThemeCtx { theme: Theme; resolved: "light" | "dark"; setTheme: (t: Theme) => void; }

const Ctx = createContext<ThemeCtx | undefined>(undefined);

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem("tdd-theme") as Theme) || "system"
  );
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const apply = () => {
      const r = theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
      setResolved(r);
      document.documentElement.setAttribute("data-theme", r);
    };
    apply();
    if (theme === "system" && typeof window.matchMedia === "function") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem("tdd-theme", t);
    setThemeState(t);
  };

  return <Ctx.Provider value={{ theme, resolved, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
