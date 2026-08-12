import { apiClient, unwrap } from "./apiClient";
import type { WorkflowRun } from "@/types";

export const workflowApi = {
  list: () => unwrap<{ workflows: WorkflowRun[] }>(apiClient.get("/workflows")),
  start: (story_uuid: string, capabilities: string[]) =>
    unwrap<{ workflow_id: string; task_id: string; status: string }>(
      apiClient.post("/workflows", { story_uuid, capabilities })),
  detail: (id: string) =>
    unwrap<{ workflow: WorkflowRun; agent_runs: unknown[] }>(apiClient.get(`/workflows/${id}`)),
  status: (id: string) =>
    unwrap<{ workflow_id: string; status: string; current_stage: string; current_agent?: string }>(
      apiClient.get(`/workflows/${id}/status`)),
};
