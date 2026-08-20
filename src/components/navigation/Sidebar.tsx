import { useState, useEffect } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { projectApi } from "@/services/api/projectApi";
import type { Project } from "@/types";
import {
  LayoutDashboard,
  FolderKanban,
  GitBranch,
  Bot,
  ShieldCheck,
  BookOpen,
  Plug,
  Settings,
  FileCheck2,
  Layers,
  ArrowLeft,
} from "lucide-react";

// 1. General Navigation (Global Root View)
const GENERAL_NAV = [
  {
    section: "Overview",
    items: [
      { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/app/projects", label: "Projects", icon: FolderKanban },
    ],
  },
  {
    section: "AI Operations & Governance",
    items: [
      { to: "/app/agents", label: "Agent Monitor", icon: Bot },
      { to: "/app/approvals", label: "Approval Center", icon: ShieldCheck },
      { to: "/app/audit", label: "Audit & Guardrails", icon: ShieldCheck },
    ],
  },
  {
    section: "Admin",
    items: [
      { to: "/app/settings", label: "Settings", icon: Settings },
      { to: "/app/integrations", label: "Integrations", icon: Plug },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const [projectInfo, setProjectInfo] = useState<Project | null>(null);
  const [inferredProjUuid, setInferredProjUuid] = useState<string | null>(null);

  // Detect project UUID from URL path: /app/projects/:uuid or query param ?project=:uuid
  const pathMatch = location.pathname.match(/^\/app\/projects\/([a-zA-Z0-9-]+)/);
  const pathUuid = pathMatch && pathMatch[1] !== "new" ? pathMatch[1] : null;
  const searchUuid = new URLSearchParams(location.search).get("project");

  // Check if viewing a workflow detail page without explicit ?project= param
  const workflowMatch = location.pathname.match(/^\/app\/workflows\/([a-zA-Z0-9-]+)/);
  const workflowId = workflowMatch ? workflowMatch[1] : null;

  useEffect(() => {
    let isMounted = true;
    if (workflowId && !searchUuid && !pathUuid) {
      import("@/services/api/workflowApi").then(({ workflowApi }) => {
        workflowApi
          .status(workflowId)
          .then((st) => {
            if (isMounted && st.project_uuid) {
              setInferredProjUuid(st.project_uuid);
            }
          })
          .catch(() => {});
      });
    } else {
      setInferredProjUuid(null);
    }
    return () => {
      isMounted = false;
    };
  }, [workflowId, searchUuid, pathUuid]);

  const activeProjectUuid = pathUuid || searchUuid || inferredProjUuid;

  useEffect(() => {
    let isMounted = true;
    if (activeProjectUuid) {
      projectApi
        .detail(activeProjectUuid)
        .then((res) => {
          if (isMounted) setProjectInfo(res.project);
        })
        .catch(() => {
          if (isMounted) setProjectInfo(null);
        });
    } else {
      setProjectInfo(null);
    }
    return () => {
      isMounted = false;
    };
  }, [activeProjectUuid]);

  // Robust active-item matcher
  const isNavActive = (targetTo: string) => {
    const [targetPath, targetQuery] = targetTo.split("?");
    const currentPath = location.pathname;

    // Exact path matches
    if (currentPath === targetPath) {
      if (!targetQuery) return true;
      const targetParams = new URLSearchParams(targetQuery);
      const currentParams = new URLSearchParams(location.search);
      let allMatch = true;
      targetParams.forEach((val, key) => {
        if (currentParams.get(key) !== val) allMatch = false;
      });
      return allMatch;
    }

    // Workflows detail view match (e.g. /app/workflows/:id matches /app/workflows)
    if (targetPath === "/app/workflows" && currentPath.startsWith("/app/workflows/")) {
      return true;
    }

    // Project workspace detail match
    if (targetPath.startsWith("/app/projects/") && currentPath.startsWith(targetPath)) {
      return true;
    }

    return false;
  };

  // If inside a project workspace:
  if (activeProjectUuid) {
    const projectNav = [
      {
        section: "Project Workspace",
        items: [
          {
            to: `/app/projects/${activeProjectUuid}`,
            label: "Project Dashboard",
            icon: LayoutDashboard,
          },
          {
            to: `/app/stories?project=${activeProjectUuid}`,
            label: "User Stories",
            icon: BookOpen,
          },
          {
            to: `/app/knowledge?project=${activeProjectUuid}`,
            label: "Knowledge Base & RAG",
            icon: Layers,
          },
        ],
      },
      {
        section: "TDD Execution",
        items: [
          {
            to: `/app/workflows?project=${activeProjectUuid}`,
            label: "Workflow Runs",
            icon: GitBranch,
          },
          {
            to: `/app/new-workflow?project=${activeProjectUuid}`,
            label: "New Workflow",
            icon: FileCheck2,
          },
        ],
      },
      {
        section: "Governance & Ops",
        items: [
          {
            to: `/app/approvals?project=${activeProjectUuid}`,
            label: "Approval Center",
            icon: ShieldCheck,
          },
          {
            to: `/app/agents?project=${activeProjectUuid}`,
            label: "Agent Monitor",
            icon: Bot,
          },
        ],
      },
    ];

    return (
      <aside className="hidden w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-4 md:flex">
        {/* Back to All Projects Link */}
        <Link
          to="/app/projects"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-primary)] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>All Projects</span>
        </Link>

        {/* Current Active Project Banner */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="rounded bg-[var(--color-primary)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
              {projectInfo?.key_code || "PROJ"}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
              Active
            </span>
          </div>
          <p className="font-display font-semibold text-xs text-[var(--color-text-primary)] truncate">
            {projectInfo?.name || "Loading project..."}
          </p>
          {projectInfo?.target_language && (
            <p className="text-[10px] text-[var(--color-text-secondary)] uppercase">
              {projectInfo.target_language} · {projectInfo.backend_framework || projectInfo.target_framework || "TDD"}
            </p>
          )}
        </div>

        {/* Project Specific Nav Items */}
        <div className="flex flex-col gap-4">
          {projectNav.map((group) => (
            <div key={group.section}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                {group.section}
              </p>
              <nav className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isCurrent = isNavActive(item.to);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={() =>
                        `flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-xs font-medium transition-colors ${
                          isCurrent
                            ? "bg-[var(--color-surface-elevated)] font-semibold text-[var(--color-primary)] shadow-sm border border-[var(--color-border-orange)]/40"
                            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]/40 hover:text-[var(--color-text-primary)]"
                        }`
                      }
                    >
                      <Icon size={15} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  // General Global Navigation
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-5 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-5 md:flex">
      {GENERAL_NAV.map((group) => (
        <div key={group.section}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {group.section}
          </p>
          <nav className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isCurrent = isNavActive(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={() =>
                    `flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-xs font-medium transition-colors ${
                      isCurrent
                        ? "bg-[var(--color-surface-elevated)] font-semibold text-[var(--color-primary)] shadow-sm border border-[var(--color-border-orange)]/40"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]/40 hover:text-[var(--color-text-primary)]"
                    }`
                  }
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      ))}
    </aside>
  );
}
