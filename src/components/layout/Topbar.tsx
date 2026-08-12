import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/Button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5">
      <div className="flex items-center gap-2">
        <span className="font-display text-sm font-semibold text-[var(--color-primary)]">TDD Intelligence</span>
        <span className="hidden text-xs text-[var(--color-text-secondary)] sm:inline">AI proposes · Tools execute · Humans approve</span>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {user && (
          <div className="hidden items-center gap-2 sm:flex">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight text-[var(--color-text-primary)]">{user.name}</p>
              <p className="text-[11px] leading-tight text-[var(--color-text-secondary)]">{user.roles.join(", ")}</p>
            </div>
          </div>
        )}
        <Button variant="ghost" onClick={() => { logout(); navigate("/login"); }} aria-label="Log out">
          <LogOut size={16} />
        </Button>
      </div>
    </header>
  );
}
