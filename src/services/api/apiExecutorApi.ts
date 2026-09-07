import { apiClient, unwrap } from "./apiClient";
import type { ApiEndpointItem, ApiRunPayload, ExecutionRun } from "@/types";

export const apiExecutorApi = {
  runTests: (payload: ApiRunPayload): Promise<ExecutionRun> =>
    unwrap(apiClient.post("/api-executor/run", payload)),

  listRuns: (params?: { project_uuid?: string; story_uuid?: string; limit?: number }): Promise<{ runs: ExecutionRun[] }> =>
    unwrap(apiClient.get("/api-executor/runs", { params })),

  getRun: (runUuid: string): Promise<ExecutionRun> =>
    unwrap(apiClient.get(`/api-executor/runs/${runUuid}`)),

  getStoryTestCases: (storyUuid: string): Promise<{ story: any; test_cases: ApiEndpointItem[]; total: number }> =>
    unwrap(apiClient.get(`/api-executor/stories/${storyUuid}/test-cases`)),

  parseCollectionJson: (collection: any, collectionName?: string): Promise<{ collection_name: string; endpoints: ApiEndpointItem[]; total: number }> =>
    unwrap(apiClient.post("/api-executor/parse-collection", { collection, collection_name: collectionName })),

  parseCollectionFile: (file: File): Promise<{ collection_name: string; endpoints: ApiEndpointItem[]; total: number }> => {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap(
      apiClient.post("/api-executor/parse-collection", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
  },

  executeSingle: (payload: {
    base_url?: string;
    endpoint: Partial<ApiEndpointItem> & { method: string; path: string };
  }): Promise<{ result: any; extracted_tokens: Record<string, any> }> =>
    unwrap(apiClient.post("/api-executor/execute-single", payload)),

  pingTarget: (url: string): Promise<{ reachable: boolean; status_code?: number; latency_ms?: number; error?: string }> =>
    unwrap(apiClient.post("/api-executor/ping", { url })),
};
