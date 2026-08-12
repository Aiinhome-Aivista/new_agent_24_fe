import { apiClient, unwrap } from "./apiClient";
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

  create: (data: CreateStoryPayload) =>
    unwrap<{ story_id: number; uuid: string; external_key: string; title: string; acceptance_criteria: AcceptanceCriterion[] }>(
      apiClient.post("/stories", data)
    ),

  addAc: (storyUuid: string, acData: { ac_key?: string; text: string }) =>
    unwrap<AcceptanceCriterion>(apiClient.post(`/stories/${storyUuid}/acceptance-criteria`, acData)),
};
