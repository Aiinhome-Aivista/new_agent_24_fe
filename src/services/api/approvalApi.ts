import { apiClient, unwrap } from "./apiClient";
import type { Approval } from "@/types";

export const approvalApi = {
  pending: () => unwrap<{ approvals: Approval[] }>(apiClient.get("/approvals")),
  forWorkflow: (id: string) =>
    unwrap<{ approvals: Approval[] }>(apiClient.get(`/workflows/${id}/approvals`)),
  decide: (uuid: string, decision: string, comment = "") =>
    unwrap<{ decision: string; resumed?: string }>(
      apiClient.post(`/approvals/${uuid}/decision`, { decision, comment })),
};
