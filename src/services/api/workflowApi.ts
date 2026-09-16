import { apiClient, unwrap, getAccessToken } from "./apiClient";
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
  getEvidenceDownloadUrl: (id: string, format = "html", inline = false) => {
    const token = getAccessToken();
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
    return `/api/v1/workflows/${id}/evidence/download?format=${format}${inline ? "&inline=true" : ""}${tokenParam}`;
  },
  getEvidenceHtmlContent: (id: string) =>
    apiClient
      .get(`/workflows/${id}/evidence/download?format=html&inline=true`, {
        responseType: "text",
        transformResponse: [(data) => data],
      })
      .then((res) => (typeof res.data === "string" ? res.data : JSON.stringify(res.data))),
  providePostman: (id: string, payload: FormData | { collection?: any; collection_json?: string; file_name?: string }) =>
    unwrap<{
      workflow_id: string;
      status: string;
      current_stage: string;
      task_id?: string;
      resume_status?: string;
      endpoints_count: number;
      collection_name: string;
    }>(
      payload instanceof FormData
        ? apiClient.post(`/workflows/${id}/provide-postman`, payload, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        : apiClient.post(`/workflows/${id}/provide-postman`, payload)
    ),
};

