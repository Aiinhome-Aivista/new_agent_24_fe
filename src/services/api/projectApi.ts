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

interface CacheEntry<T> {
  promise?: Promise<T>;
  data?: T;
  timestamp: number;
}

const detailCache = new Map<string, CacheEntry<any>>();
const listCache: CacheEntry<any> = { timestamp: 0 };
const CACHE_TTL_MS = 3000;

export function invalidateProjectCache(uuid?: string) {
  if (uuid) {
    detailCache.delete(uuid);
  } else {
    detailCache.clear();
  }
  listCache.timestamp = 0;
  listCache.promise = undefined;
  listCache.data = undefined;
}

export const projectApi = {
  list: (forceRefresh = false): Promise<{ projects: Project[] }> => {
    const now = Date.now();
    if (!forceRefresh) {
      if (listCache.promise) {
        return listCache.promise;
      }
      if (listCache.data && now - listCache.timestamp < CACHE_TTL_MS) {
        return Promise.resolve(listCache.data);
      }
    } else {
      invalidateProjectCache();
    }
    const p = unwrap<{ projects: Project[] }>(apiClient.get("/projects"))
      .then((data) => {
        listCache.data = data;
        listCache.timestamp = Date.now();
        listCache.promise = undefined;
        return data;
      })
      .catch((err) => {
        listCache.promise = undefined;
        throw err;
      });
    listCache.promise = p;
    return p;
  },

  detail: (uuid: string, forceRefresh = false): Promise<{
    project: Project;
    stories: Story[];
    knowledge?: KnowledgeDocument[];
    contracts: { services: any[]; contracts: ApiContract[] };
    workflows?: (WorkflowRun & { story_title?: string; story_key?: string })[];
  }> => {
    const now = Date.now();
    const existing = detailCache.get(uuid);
    if (!forceRefresh) {
      if (existing?.promise) {
        return existing.promise;
      }
      if (existing?.data && now - existing.timestamp < CACHE_TTL_MS) {
        return Promise.resolve(existing.data);
      }
    } else {
      detailCache.delete(uuid);
    }
    const p = unwrap<{
      project: Project;
      stories: Story[];
      knowledge?: KnowledgeDocument[];
      contracts: { services: any[]; contracts: ApiContract[] };
      workflows?: (WorkflowRun & { story_title?: string; story_key?: string })[];
    }>(apiClient.get(`/projects/${uuid}`))
      .then((data) => {
        detailCache.set(uuid, { data, timestamp: Date.now() });
        return data;
      })
      .catch((err) => {
        detailCache.delete(uuid);
        throw err;
      });
    detailCache.set(uuid, { promise: p, timestamp: now });
    return p;
  },

  create: (data: CreateProjectPayload) => {
    invalidateProjectCache();
    return unwrap<{ project_id: number; uuid: string; key_code: string; name: string }>(
      apiClient.post("/projects", data)
    );
  },

  delete: (uuid: string) => {
    invalidateProjectCache(uuid);
    return unwrap<{ message: string; uuid: string }>(apiClient.delete(`/projects/${uuid}`));
  },

  testGitConnection: (payload: TestGitConnectionPayload) =>
    unwrap<GitConnectionResult>(
      apiClient.post("/projects/test-git-connection", payload)
    ),

  testProjectGitConnection: (projectUuid: string, payload?: Partial<TestGitConnectionPayload>) =>
    unwrap<GitConnectionResult>(
      apiClient.post(`/projects/${projectUuid}/test-git-connection`, payload || {})
    ),

  addContract: (projectUuid: string, contract: { service_name: string; method: string; path: string; request_schema?: any; response_schema?: any }) => {
    invalidateProjectCache(projectUuid);
    return unwrap<ApiContract>(apiClient.post(`/projects/${projectUuid}/contracts`, contract));
  },

  uploadCollection: (projectUuid: string, formData: FormData) => {
    invalidateProjectCache(projectUuid);
    return unwrap<{ service: string; contracts_created: number }>(
      apiClient.post(`/projects/${projectUuid}/contracts/upload-collection`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
  },
};


