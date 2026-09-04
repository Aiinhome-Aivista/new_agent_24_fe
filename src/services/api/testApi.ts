import { apiClient, unwrap } from "./apiClient";
import type { TestCase, ExecutionRun, CodeQualityRun, CodeLog, CoverageMatrixItem, GenerationSummary, ContractGap } from "@/types";

export const testApi = {
  forWorkflow: (id: string) =>
    unwrap<{
      test_cases: TestCase[];
      coverage_matrix?: CoverageMatrixItem[];
      generation_summary?: GenerationSummary;
      contract_gaps?: ContractGap[];
    }>(apiClient.get(`/workflows/${id}/test-cases`)),
  setStatus: (uuid: string, status: string) =>
    unwrap(apiClient.post(`/test-cases/${uuid}/status`, { status })),
  executions: (id: string) =>
    unwrap<{ executions: ExecutionRun[] }>(apiClient.get(`/workflows/${id}/executions`)),
  codeQuality: (id: string) =>
    unwrap<{ code_quality: CodeQualityRun[] }>(apiClient.get(`/workflows/${id}/code-quality`)),
  codeLog: (id: string) =>
    unwrap<{ code_log: CodeLog | null }>(apiClient.get(`/workflows/${id}/code-log`)),
  runLiveTest: (id: string, scenario: any, environment: string) =>
    unwrap<{ result: any }>(apiClient.post(`/workflows/${id}/run-live-test`, { scenario, environment })),
  liveProxy: (scenario: any, environment: string) =>
    unwrap<{ result: any }>(apiClient.post(`/live-proxy`, { scenario, environment })),
};


