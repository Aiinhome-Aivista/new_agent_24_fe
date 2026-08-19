import { apiClient, unwrap } from "./apiClient";
import type { Project, Story, ApiContract, KnowledgeDocument, WorkflowRun, GitConnectionResult } from "@/types";

export interface CreateProjectPayload {
  key_code: string;
  name: string;
  description?: string;
  target_language?: string;
  target_framework?: string;
  coding_standard?: string;
  git_repo_url?: string;
  git_provider?: string;
  git_branch?: string;
  base_branch?: string;
  tech_stack?: string;
  build_tool?: string;
  app_type?: string;
  deployment_target?: string;
  testing_framework?: string;
  integration_test_framework?: string;
  mocking_library?: string;
  target_coverage?: string;
  frontend_framework?: string;
  backend_framework?: string;
}

export interface TestGitConnectionPayload {
  git_repo_url: string;
  git_branch?: string;
  git_provider?: string;
  token?: string;
}

export const projectApi = {
  list: () => unwrap<{ projects: Project[] }>(apiClient.get("/projects")),

  detail: (uuid: string) =>
    unwrap<{
      project: Project;
      stories: Story[];
      knowledge?: KnowledgeDocument[];
      contracts: { services: any[]; contracts: ApiContract[] };
      workflows?: (WorkflowRun & { story_title?: string; story_key?: string })[];
    }>(
      apiClient.get(`/projects/${uuid}`)
    ),

  create: (data: CreateProjectPayload) =>
    unwrap<{ project_id: number; uuid: string; key_code: string; name: string }>(
      apiClient.post("/projects", data)
    ),

  testGitConnection: (payload: TestGitConnectionPayload) =>
    unwrap<GitConnectionResult>(
      apiClient.post("/projects/test-git-connection", payload)
    ),

  testProjectGitConnection: (projectUuid: string, payload?: Partial<TestGitConnectionPayload>) =>
    unwrap<GitConnectionResult>(
      apiClient.post(`/projects/${projectUuid}/test-git-connection`, payload || {})
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

