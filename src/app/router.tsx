import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { LandingPage } from "@/features/auth/LandingPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { ProjectDashboardPage } from "@/features/projects/ProjectDashboardPage";
import { KnowledgePage } from "@/features/knowledge/KnowledgePage";
import { StoriesPage } from "@/features/stories/StoriesPage";
import { WorkflowsPage } from "@/features/workflow-runs/WorkflowsPage";
import { WorkflowDetailPage } from "@/features/workflow-runs/WorkflowDetailPage";
import { NewWorkflowPage } from "@/features/test-generation/NewWorkflowPage";
import { AgentMonitorPage } from "@/features/agent-monitor/AgentMonitorPage";
import { ApprovalsPage } from "@/features/approvals/ApprovalsPage";
import { AuditPage } from "@/features/audit/AuditPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { IntegrationsPage } from "@/features/integrations/IntegrationsPage";
import { ApiExecutorPage } from "@/features/api-executor/ApiExecutorPage";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  {
    path: "/app",
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "projects/:uuid", element: <ProjectDashboardPage /> },
      { path: "knowledge", element: <KnowledgePage /> },
      { path: "stories", element: <StoriesPage /> },
      { path: "workflows", element: <WorkflowsPage /> },
      { path: "workflows/:id", element: <WorkflowDetailPage /> },
      { path: "new-workflow", element: <NewWorkflowPage /> },
      { path: "api-executor", element: <ApiExecutorPage /> },
      { path: "agents", element: <AgentMonitorPage /> },
      { path: "approvals", element: <ApprovalsPage /> },
      { path: "audit", element: <AuditPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "integrations", element: <IntegrationsPage /> },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);
