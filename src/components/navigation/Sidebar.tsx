import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, FolderKanban, GitBranch, Bot, ShieldCheck,
  BookOpen, Plug, Settings, FileCheck2, Layers,
} from "lucide-react";


const NAV = [
  { section: "Overview", items: [{ to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { section: "Workspaces", items: [
    { to: "/app/projects", label: "Projects", icon: FolderKanban },
    { to: "/app/knowledge", label: "Knowledge Base", icon: Layers },
    { to: "/app/stories", label: "User Stories", icon: BookOpen },
  ]},

  { section: "TDD Workflow", items: [
    { to: "/app/workflows", label: "Workflow Runs", icon: GitBranch },
    { to: "/app/new-workflow", label: "New Workflow", icon: FileCheck2 },
  ]},
  { section: "AI Operations", items: [
    { to: "/app/agents", label: "Agent Monitor", icon: Bot },
  ]},
  { section: "Governance", items: [
    { to: "/app/approvals", label: "Approval Center", icon: ShieldCheck },
    { to: "/app/audit", label: "Audit & Guardrails", icon: ShieldCheck },
  ]},
  { section: "Admin", items: [
    { to: "/app/settings", label: "Settings", icon: Settings },
    { to: "/app/integrations", label: "Integrations", icon: Plug },
  ]},
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-5 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-5 md:flex">
      {NAV.map((group) => (
        <div key={group.section}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {group.section}
          </p>
          <nav className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-[var(--color-surface-elevated)] font-medium text-[var(--color-primary)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`
                }>
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}
    </aside>
  );
}
