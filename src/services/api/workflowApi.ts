import { apiClient, unwrap } from "./apiClient";
import type { WorkflowRun, WorkflowSLA, AlmPreview } from "@/types";

export const workflowApi = {
  list: (project_uuid?: string) =>
    unwrap<{ workflows: WorkflowRun[] }>(
      apiClient.get(project_uuid ? `/workflows?project=${project_uuid}` : "/workflows")
    ),
  start: (story_uuid: string, capabilities: string[]) =>
    unwrap<{ workflow_id: string; task_id: string; status: string }>(
      apiClient.post("/workflows", { story_uuid, capabilities })),
  detail: (id: string) =>
    unwrap<{ workflow: WorkflowRun; agent_runs: unknown[] }>(apiClient.get(`/workflows/${id}`)),
  status: (id: string) =>
    unwrap<{
      workflow_id: string;
      status: string;
      current_stage: string;
      current_agent?: string;
      project_uuid?: string;
      story_title?: string;
    }>(apiClient.get(`/workflows/${id}/status`)),
  sla: (id: string) =>
    unwrap<{ sla: WorkflowSLA }>(apiClient.get(`/workflows/${id}/sla`)),
  almPreview: (id: string, provider = "azure_devops") =>
    unwrap<{ preview: AlmPreview }>(apiClient.get(`/workflows/${id}/alm-preview?provider=${provider}`)),
  getEvidenceDownloadUrl: (id: string, format = "html") =>
    `/api/v1/workflows/${id}/evidence/download?format=${format}`,
};

