export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  request_id: string;
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface Project {
  uuid: string;
  key_code: string;
  name: string;
  description?: string;
  target_language?: string;
  target_framework?: string;
  coding_standard?: string;
  health: "green" | "amber" | "red";
  story_count?: number;
  active_workflows?: number;
}

export interface AcceptanceCriterion {
  uuid?: string;
  ac_key: string;
  text: string;
}

export interface Story {
  uuid: string;
  external_key?: string;
  title: string;
  description?: string;
  sprint?: string;
  status: string;
  coverage_pct: number;
  project_key?: string;
  project_name?: string;
  acceptance_criteria?: AcceptanceCriterion[];
}

export interface KnowledgeDocument {
  id?: number;
  uuid: string;
  project_id: number;
  title: string;
  doc_type: string;
  source?: string;
  version: string;
  index_status: string;
  chunk_count: number;
  uploader_name?: string;
  created_at: string;
}

export interface KnowledgeChunk {
  content: string;
  source: string;
  metadata: Record<string, unknown>;
}

export interface ApiContract {
  uuid: string;
  service_name?: string;
  method: string;
  path: string;
  request_schema?: Record<string, unknown>;
  response_schema?: Record<string, unknown>;
  version?: string;
}

export type WorkflowStatus =
  | "DRAFT" | "QUEUED" | "RUNNING" | "WAITING_FOR_REVIEW" | "EXECUTING"
  | "VALIDATING" | "GENERATING_EVIDENCE" | "WAITING_FOR_APPROVAL"
  | "APPROVED" | "COMPLETED" | "BLOCKED" | "FAILED" | "CANCELLED";

export interface WorkflowRun {
  workflow_id: string;
  status: WorkflowStatus;
  current_stage: string;
  current_agent?: string;
  story_id?: number;
  created_at?: string;
}

export interface TestCase {
  uuid: string;
  test_key: string;
  scenario_type: string;
  title: string;
  status: string;
  origin: string;
  priority: string;
}

export interface Approval {
  uuid: string;
  workflow_id: string;
  stage: string;
  decision: string;
  requested_at: string;
}

export interface AgentInfo {
  name: string;
  label: string;
  last_run?: { status: string; created_at: string };
}

export interface DashboardKpis {
  active_workflows: number;
  pending_approvals: number;
  tests_executed: number;
  pass_rate: number;
  requirement_coverage: number;
  evidence_ready: number;
}
