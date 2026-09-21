import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loading } from "@/components/ui/Loading";

// Lazy-loaded route components for code-splitting and faster initial page loads
const LandingPage = lazy(() => import("@/features/auth/LandingPage").then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("@/features/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ProjectsPage = lazy(() => import("@/features/projects/ProjectsPage").then((m) => ({ default: m.ProjectsPage })));
const ProjectDashboardPage = lazy(() => import("@/features/projects/ProjectDashboardPage").then((m) => ({ default: m.ProjectDashboardPage })));
const KnowledgePage = lazy(() => import("@/features/knowledge/KnowledgePage").then((m) => ({ default: m.KnowledgePage })));
const StoriesPage = lazy(() => import("@/features/stories/StoriesPage").then((m) => ({ default: m.StoriesPage })));
const WorkflowsPage = lazy(() => import("@/features/workflow-runs/WorkflowsPage").then((m) => ({ default: m.WorkflowsPage })));
const WorkflowDetailPage = lazy(() => import("@/features/workflow-runs/WorkflowDetailPage").then((m) => ({ default: m.WorkflowDetailPage })));
const NewWorkflowPage = lazy(() => import("@/features/test-generation/NewWorkflowPage").then((m) => ({ default: m.NewWorkflowPage })));
const AgentMonitorPage = lazy(() => import("@/features/agent-monitor/AgentMonitorPage").then((m) => ({ default: m.AgentMonitorPage })));
const ApprovalsPage = lazy(() => import("@/features/approvals/ApprovalsPage").then((m) => ({ default: m.ApprovalsPage })));
const AuditPage = lazy(() => import("@/features/audit/AuditPage").then((m) => ({ default: m.AuditPage })));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const IntegrationsPage = lazy(() => import("@/features/integrations/IntegrationsPage").then((m) => ({ default: m.IntegrationsPage })));
const ApiExecutorPage = lazy(() => import("@/features/api-executor/ApiExecutorPage").then((m) => ({ default: m.ApiExecutorPage })));

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: withSuspense(LandingPage) },
  { path: "/login", element: withSuspense(LoginPage) },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", element: withSuspense(DashboardPage) },
      { path: "projects", element: withSuspense(ProjectsPage) },
      { path: "projects/:uuid", element: withSuspense(ProjectDashboardPage) },
      { path: "knowledge", element: withSuspense(KnowledgePage) },
      { path: "stories", element: withSuspense(StoriesPage) },
      { path: "workflows", element: withSuspense(WorkflowsPage) },
      { path: "workflows/:id", element: withSuspense(WorkflowDetailPage) },
      { path: "new-workflow", element: withSuspense(NewWorkflowPage) },
      { path: "api-executor", element: withSuspense(ApiExecutorPage) },
      { path: "agents", element: withSuspense(AgentMonitorPage) },
      { path: "approvals", element: withSuspense(ApprovalsPage) },
      { path: "audit", element: withSuspense(AuditPage) },
      { path: "settings", element: withSuspense(SettingsPage) },
      { path: "integrations", element: withSuspense(IntegrationsPage) },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);
