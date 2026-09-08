import { apiClient, unwrap } from "./apiClient";
import { invalidateProjectCache } from "./projectApi";
import type { Story, AcceptanceCriterion } from "@/types";

export interface CreateStoryPayload {
  project_uuid: string;
  external_key?: string;
  title: string;
  description?: string;
  sprint?: string;
  acceptance_criteria?: Array<{ ac_key?: string; text: string } | string>;
}

export const storyApi = {
  list: (projectUuid?: string) =>
    unwrap<{ stories: Story[] }>(apiClient.get(projectUuid ? `/stories?project=${projectUuid}` : "/stories")),

  detail: (uuid: string) =>
    unwrap<{ story: Story; acceptance_criteria: AcceptanceCriterion[] }>(
      apiClient.get(`/stories/${uuid}`)
    ),

  create: (data: CreateStoryPayload) => {
    invalidateProjectCache(data.project_uuid);
    return unwrap<{ story_id: number; uuid: string; external_key: string; title: string; acceptance_criteria: AcceptanceCriterion[] }>(
      apiClient.post("/stories", data)
    );
  },

  addAc: (storyUuid: string, acData: { ac_key?: string; text: string }) => {
    invalidateProjectCache();
    return unwrap<AcceptanceCriterion>(apiClient.post(`/stories/${storyUuid}/acceptance-criteria`, acData));
  },

  delete: (uuid: string) => {
    invalidateProjectCache();
    return unwrap<{ message: string; uuid: string }>(apiClient.delete(`/stories/${uuid}`));
  },

  parseDocument: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap<{
      title: string;
      external_key: string;
      sprint: string;
      description: string;
      acceptance_criteria: Array<{ ac_key: string; text: string }>;
      extracted_count: number;
      source_type: string;
      raw_text_length: number;
    }>(
      apiClient.post("/stories/parse-document", formData)
    );
  },
};

