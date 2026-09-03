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
  project_uuid?: string;
  project_key?: string;
  project_name?: string;
  acceptance_criteria?: AcceptanceCriterion[];
  workflow_id?: string;
  workflow_status?: string;
  workflow_stage?: string;
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
  project_uuid?: string;
  project_name?: string;
  project_key?: string;
  story_id?: number;
  story_title?: string;
  story_key?: string;
  created_at?: string;
  state_json?: {
    extracted_apis?: ExtractedApi[];
    [key: string]: any;
  };
}

export interface ManualTestScenario {
  id?: string;
  title: string;
  status_code: number;
  status_text?: string;
  scenario_type?: "POSITIVE" | "NEGATIVE" | "BOUNDARY" | "SECURITY";
  description?: string;
  actual_payload?: Record<string, any> | null;
  actual_response?: Record<string, any> | null;
}

export interface ExtractedApiResponseSchema {
  status_code?: number;
  description?: string;
  body?: Record<string, any>;
}

export interface ExtractedApi {
  method: string;
  url: string;
  path?: string;
  purpose?: string;
  source_file?: string;
  handler_function?: string;
  payload_schema?: Record<string, any>;
  response_schema?: ExtractedApiResponseSchema | Record<string, any>;
  test_scenarios?: ManualTestScenario[];
}

export interface CodeFileWriteInfo {
  file_path: string;
  relative_path?: string;
  lines_count: number;
  class_name?: string;
  tests_count?: number;
}

export interface CodeLog {
  workflow_id: string;
  generated_at: string;
  target_language: string;
  target_framework: string;
  total_tests_generated: number;
  total_lines_generated: number;
  elapsed_ms: number;
  files_written: CodeFileWriteInfo[];
  log_entries: string[];
}

export interface CoverageMatrixItem {
  ac_key: string;
  requirement: string;
  full_text?: string;
  covered: boolean;
  test_case_keys: string[];
}

export interface GenerationSummary {
  total_candidates: number;
  duplicates_removed: number;
  final_unique_test_cases: number;
  acceptance_criteria_total: number;
  acceptance_criteria_covered: number;
  coverage_pct: number;
  coverage_complete: boolean;
  missing_acceptance_criteria: string[];
  grounding_confirmed: number;
  grounding_partially_confirmed: number;
  needs_review: number;
  contract_gaps: number;
}

export interface GroundingSourceItem {
  source: "STORY" | "ACCEPTANCE_CRITERIA" | "API_CONTRACT" | "POSTMAN" | "PROJECT_KB" | "CODEBASE" | "GLOBAL_KB" | "AI_DERIVED" | "AI_ASSUMPTION" | "UNKNOWN" | string;
  reference?: string;
  note?: string;
}

export interface GroundingMetadata {
  endpoint?: GroundingSourceItem;
  status_code?: GroundingSourceItem;
  request_body?: GroundingSourceItem;
  response_body?: GroundingSourceItem;
  overall_grounding?: "CONFIRMED" | "PARTIALLY_CONFIRMED" | "NEEDS_REVIEW" | "AI_DERIVED" | "UNKNOWN" | string;
}

export interface RequestSpec {
  method: string;
  endpoint: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface ExpectedResponseSpec {
  status_code: number | string;
  status_source?: "ACCEPTANCE_CRITERIA" | "CONTRACT_SPECIFIED" | "AI_ASSUMPTION" | string;
  status_note?: string;
  response_body?: any;
  response_body_source?: string;
  assertions?: string[];
}

export interface TestCase {
  uuid: string;
  test_key: string;
  scenario_type: string;
  test_type?: "API" | "UNIT" | "INTEGRATION" | string;
  title: string;
  status: string;
  origin: string;
  priority: string;
  description?: string;
  story_reference?: string;
  acceptance_criteria_ids?: string[];
  preconditions?: string[] | string;
  test_data?: any;
  test_data_source?: string;
  test_steps?: string[] | string;
  request_spec?: RequestSpec;
  expected_response_spec?: ExpectedResponseSpec;
  expected_status_code?: number | string | null;
  expected_result?: string;
  grounding_metadata?: GroundingMetadata;
  requires_review?: boolean;
  assumption_details?: string;
  risk?: string;
  responsible_functions?: string[] | string | null;
  responsible_functions_source?: string;
  generated_code?: string;
  target_language?: string;
  framework?: string;
}

export interface ContractGap {
  method: string;
  endpoint: string;
  status: string;
  warning: string;
}

export interface AssertionItem {
  name: string;
  passed: boolean;
}

export interface ExecutionResultItem {
  id: number;
  uuid: string;
  status_code: number;
  passed: boolean | number;
  duration_ms: number;
  assertions?: AssertionItem[];
  method?: string;
  url?: string;
  req_headers?: Record<string, string>;
  req_body?: string;
  resp_status?: number;
  resp_headers?: Record<string, string>;
  resp_body?: string;
  is_mock?: boolean | number;
}

export interface ExecutionRun {
  id: number;
  uuid: string;
  workflow_id: string;
  runner: string;
  environment?: string;
  collection?: string;
  status: string;
  total: number;
  passed: number;
  failed: number;
  is_mock: boolean | number;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  results?: ExecutionResultItem[];
}

export interface CodeQualityIssue {
  id: number;
  severity: "blocker" | "critical" | "major" | "minor" | "info" | string;
  rule: string;
  file: string;
  line: number;
  description: string;
  remediation?: string;
}

export interface CodeQualityRun {
  id: number;
  uuid: string;
  workflow_id: string;
  analyzer: string;
  score: number;
  passed: boolean | number;
  is_mock: boolean | number;
  created_at?: string;
  issues?: CodeQualityIssue[];
}

export interface EvidencePackage {
  id?: number;
  uuid: string;
  evidence_key: string;
  workflow_id: string;
  format?: string;
  file_path?: string;
  checksum?: string;
  narrative?: string;
  approval_status: string;
  content?: string;
  created_at?: string;
}

export interface Approval {
  uuid: string;
  workflow_id: string;
  stage: string;
  decision: string;
  comment?: string;
  requested_at: string;
  decided_at?: string;
  approver_id?: number;
  approver_name?: string;
  project_uuid?: string;
  project_name?: string;
  project_key?: string;
  story_title?: string;
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

export interface GitConnectionResult {
  connected: boolean;
  status: "CONNECTED" | "CONNECTED_BRANCH_UNVERIFIED" | "BRANCH_NOT_FOUND" | "NOT_FOUND" | "AUTH_REQUIRED" | "RATE_LIMITED" | "INVALID_URL" | "TIMEOUT" | "NETWORK_ERROR" | "HTTP_ERROR" | "UNREACHABLE";
  provider?: string;
  repo?: string | null;
  branch?: string;
  default_branch?: string;
  is_private?: boolean;
  message: string;
  latency_ms?: number;
}

export interface StageSLAMetric {
  stage: string;
  label: string;
  tier: string;
  target_ms: number;
  actual_ms: number;
  delta_ms: number;
  status: "MET" | "BREACHED" | "PENDING";
  executed: boolean;
}

export interface WorkflowSLA {
  workflow_id: string;
  workflow_status: string;
  current_stage: string;
  overall_sla_status: "MET" | "BREACHED" | "IN_PROGRESS" | "WARNING";
  total_actual_latency_ms: number;
  total_target_latency_ms: number;
  stage_metrics: StageSLAMetric[];
  requirement_coverage: {
    total_acceptance_criteria: number;
    generated_test_cases: number;
    coverage_percentage: number;
    target_percentage: number;
    status: "MET" | "WARNING" | "BREACHED";
  };
  quality_gate: {
    score: number;
    threshold: number;
    status: "PASS" | "FAIL";
    issues_count: number;
  };
  api_execution_sla: {
    pass_rate_percentage: number;
    target_pass_rate: number;
    total_executed: number;
    total_passed: number;
    status: "MET" | "BREACHED";
  };
  token_observability: {
    estimated_prompt_tokens: number;
    estimated_completion_tokens: number;
    estimated_total_tokens: number;
    estimated_cost_usd: number;
    currency: string;
  };
}

export interface AlmPreview {
  target_system: string;
  endpoint: string;
  headers: Record<string, string>;
  payload: Record<string, unknown> | Array<unknown>;
}


