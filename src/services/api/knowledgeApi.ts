import { apiClient, unwrap } from "./apiClient";
import type { KnowledgeDocument, KnowledgeChunk, Project } from "@/types";

export const knowledgeApi = {
  list: (projectUuid: string) =>
    unwrap<{ documents: KnowledgeDocument[]; project: Project }>(
      apiClient.get(`/projects/${projectUuid}/knowledge`)
    ),

  upload: (projectUuid: string, formData: FormData) =>
    unwrap<KnowledgeDocument>(
      apiClient.post(`/projects/${projectUuid}/knowledge`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ),

  uploadText: (projectUuid: string, data: { title: string; content: string; doc_type: string; version?: string }) =>
    unwrap<KnowledgeDocument>(
      apiClient.post(`/projects/${projectUuid}/knowledge`, data)
    ),

  delete: (docUuid: string) =>
    unwrap<{ success: boolean }>(apiClient.delete(`/knowledge/${docUuid}`)),

  query: (projectUuid: string, query: string, top_k = 5) =>
    unwrap<{ project_id: number; project_key: string; query: string; chunks: KnowledgeChunk[] }>(
      apiClient.post(`/projects/${projectUuid}/rag/query`, { query, top_k })
    ),
};
