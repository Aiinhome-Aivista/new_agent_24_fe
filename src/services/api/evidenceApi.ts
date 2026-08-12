import { apiClient, unwrap } from "./apiClient";

export const evidenceApi = {
  forWorkflow: (id: string) =>
    unwrap<{ evidence: unknown[] }>(apiClient.get(`/workflows/${id}/evidence`)),
};
