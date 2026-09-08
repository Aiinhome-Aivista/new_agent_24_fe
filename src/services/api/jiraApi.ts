import { apiClient, unwrap } from "./apiClient";

export interface JiraStatusResponse {
  configured: boolean;
  connected: boolean;
  display_name?: string;
  email?: string;
  account_id?: string;
  base_url?: string;
  project_key?: string;
  error?: string;
  message?: string;
}

export interface JiraIssueSummary {
  key: string;
  summary: string;
  issue_type: string;
  status: string;
  created: string;
  updated: string;
}

export interface JiraStoryDetail {
  external_key: string;
  title: string;
  sprint: string;
  description: string;
  issue_type: string;
  status: string;
  acceptance_criteria: Array<{ ac_key: string; text: string }>;
  extracted_count: number;
  source_type: string;
}

export const jiraApi = {
  getStatus: () =>
    unwrap<JiraStatusResponse>(apiClient.get("/jira/status")),

  listStories: (projectKey?: string, maxResults: number = 30) =>
    unwrap<{ issues: JiraIssueSummary[]; configured: boolean; count: number }>(
      apiClient.get(`/jira/stories?${projectKey ? `project=${encodeURIComponent(projectKey)}&` : ""}max_results=${maxResults}`)
    ),

  fetchStory: (issueKey: string) =>
    unwrap<JiraStoryDetail>(
      apiClient.post("/jira/fetch-story", { issue_key: issueKey })
    ),
};
