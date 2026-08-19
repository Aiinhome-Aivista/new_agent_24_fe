import { apiClient, unwrap } from "./apiClient";
import type { TestCase, ExecutionRun, CodeQualityRun } from "@/types";

export const testApi = {
  forWorkflow: (id: string) =>
    unwrap<{ test_cases: TestCase[] }>(apiClient.get(`/workflows/${id}/test-cases`)),
  setStatus: (uuid: string, status: string) =>
    unwrap(apiClient.post(`/test-cases/${uuid}/status`, { status })),
  executions: (id: string) =>
    unwrap<{ executions: ExecutionRun[] }>(apiClient.get(`/workflows/${id}/executions`)),
  codeQuality: (id: string) =>
    unwrap<{ code_quality: CodeQualityRun[] }>(apiClient.get(`/workflows/${id}/code-quality`)),
};

