import { apiClient, unwrap } from "./apiClient";

export const executionApi = {
  forWorkflow: (id: string) =>
    unwrap<{ executions: unknown[] }>(apiClient.get(`/workflows/${id}/executions`)),
};
