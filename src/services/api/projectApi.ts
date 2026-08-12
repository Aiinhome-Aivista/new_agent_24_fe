import { apiClient, unwrap } from "./apiClient";
import type { Project, Story, ApiContract } from "@/types";

export interface CreateProjectPayload {
  key_code: string;
  name: string;
  description?: string;
  target_language?: string;
  target_framework?: string;
  coding_standard?: string;
}

export const projectApi = {
  list: () => unwrap<{ projects: Project[] }>(apiClient.get("/projects")),

  detail: (uuid: string) =>
    unwrap<{ project: Project; stories: Story[]; contracts: { services: any[]; contracts: ApiContract[] } }>(
      apiClient.get(`/projects/${uuid}`)
    ),

  create: (data: CreateProjectPayload) =>
    unwrap<{ project_id: number; uuid: string; key_code: string; name: string }>(
      apiClient.post("/projects", data)
    ),

  addContract: (projectUuid: string, contract: { service_name: string; method: string; path: string; request_schema?: any; response_schema?: any }) =>
    unwrap<ApiContract>(apiClient.post(`/projects/${projectUuid}/contracts`, contract)),

  uploadCollection: (projectUuid: string, formData: FormData) =>
    unwrap<{ service: string; contracts_created: number }>(
      apiClient.post(`/projects/${projectUuid}/contracts/upload-collection`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ),
};
