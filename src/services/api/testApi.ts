import { apiClient, unwrap } from "./apiClient";
import type { TestCase } from "@/types";

export const testApi = {
  forWorkflow: (id: string) =>
    unwrap<{ test_cases: TestCase[] }>(apiClient.get(`/workflows/${id}/test-cases`)),
  setStatus: (uuid: string, status: string) =>
    unwrap(apiClient.post(`/test-cases/${uuid}/status`, { status })),
};
