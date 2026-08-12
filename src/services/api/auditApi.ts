import { apiClient, unwrap } from "./apiClient";

export const auditApi = {
  events: (workflowId?: string) =>
    unwrap<{ events: unknown[] }>(
      apiClient.get("/audit", { params: workflowId ? { workflow_id: workflowId } : {} })),
  guardrails: (workflowId?: string) =>
    unwrap<{ events: unknown[] }>(
      apiClient.get("/guardrails", { params: workflowId ? { workflow_id: workflowId } : {} })),
};
