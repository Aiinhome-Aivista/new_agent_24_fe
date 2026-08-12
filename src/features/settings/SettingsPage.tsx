import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function SettingsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-2xl font-semibold text-[var(--color-text-primary)]">Settings</h1>
      <Card className="mb-4">
        <h2 className="mb-3 font-display text-base font-semibold text-[var(--color-text-primary)]">Profile</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-[var(--color-text-secondary)]">Name</dt><dd className="text-[var(--color-text-primary)]">{user?.name}</dd>
          <dt className="text-[var(--color-text-secondary)]">Email</dt><dd className="text-[var(--color-text-primary)]">{user?.email}</dd>
          <dt className="text-[var(--color-text-secondary)]">Roles</dt><dd className="text-[var(--color-text-primary)]">{user?.roles.join(", ")}</dd>
          <dt className="text-[var(--color-text-secondary)]">Permissions</dt><dd className="text-[var(--color-text-primary)]">{user?.permissions.length}</dd>
        </dl>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">Appearance</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">Current: {theme}</p>
          </div>
          <ThemeToggle />
        </div>
      </Card>
    </div>
  );
}
