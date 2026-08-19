import { apiClient, unwrap } from "./apiClient";
import type { EvidencePackage } from "@/types";

export const evidenceApi = {
  forWorkflow: (id: string) =>
    unwrap<{ evidence: EvidencePackage[] }>(apiClient.get(`/workflows/${id}/evidence`)),
};

