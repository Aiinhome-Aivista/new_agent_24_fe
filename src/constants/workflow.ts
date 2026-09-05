export const WORKFLOW_STAGES = [
  "CREATED", "REQUIREMENT_ANALYSIS", "SERVICE_PLANNING", "TEST_PLANNING", "TEST_PLAN_REVIEW",
  "TEST_GENERATION", "TEST_REVIEW", "CODE_GENERATION",
  "CODE_VALIDATION", "TRACEABILITY", "EVIDENCE_GENERATION", "EVIDENCE_REVIEW",
  "ALM_APPROVAL", "ALM_ATTACHMENT", "DONE",
];

export const HUMAN_CHECKPOINTS = new Set(["TEST_PLAN_REVIEW", "TEST_REVIEW", "EVIDENCE_REVIEW", "ALM_APPROVAL"]);

export const STATUS_TONE: Record<string, "success" | "warning" | "error" | "info"> = {
  COMPLETED: "success", APPROVED: "success", DONE: "success", PASS: "success",
  WAITING_FOR_REVIEW: "warning", WAITING_FOR_APPROVAL: "warning", REVIEW: "warning",
  FAILED: "error", BLOCKED: "error", CANCELLED: "error",
  RUNNING: "info", QUEUED: "info", EXECUTING: "info", VALIDATING: "info", GENERATING_EVIDENCE: "info",
};

// The canonical landing/hero workflow the whole product is built around.
export const HERO_STEPS = [
  "Requirement", "Analysis", "Test Generation", "Execution",
  "Validation", "Evidence", "Approval", "ALM",
];
