import type { Story, AcceptanceCriterion } from "@/types";
import { storyApi } from "@/services/api/storyApi";

/**
 * Generate clean, readable Markdown representation of a User Story with Acceptance Criteria.
 */
export function generateStoryMarkdown(story: Story, acceptanceCriteria?: AcceptanceCriterion[]): string {
  const acs = acceptanceCriteria || story.acceptance_criteria || [];
  const key = story.external_key || "STORY";
  const title = story.title || "Untitled Story";

  const lines: string[] = [
    `# [${key}] ${title}`,
    "",
    `- **Project:** ${story.project_name || "N/A"} (${story.project_key || "N/A"})`,
    `- **Sprint:** ${story.sprint || "Sprint 1"}`,
    `- **Status:** ${(story.status || "ready").toUpperCase()}`,
    `- **Test Coverage:** ${Number(story.coverage_pct || 0)}%`,
  ];

  if (story.workflow_id) {
    lines.push(`- **Linked Workflow:** \`${story.workflow_id}\` (${story.workflow_status || "N/A"})`);
  }

  lines.push(
    "",
    "---",
    "",
    "## Description",
    story.description ? story.description.trim() : "*No description provided.*",
    "",
    "---",
    "",
    `## Acceptance Criteria (${acs.length})`,
    ""
  );

  if (acs.length === 0) {
    lines.push("*No acceptance criteria defined for this story.*");
  } else {
    acs.forEach((ac, idx) => {
      const acKey = ac.ac_key || `AC-${idx + 1}`;
      lines.push(`### ${acKey}`);
      lines.push(ac.text || "");
      lines.push("");
    });
  }

  lines.push(
    "---",
    `*Exported from Autonomous TDD Platform on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*`
  );

  return lines.join("\n");
}

/**
 * Generate structured JSON representation of a User Story.
 */
export function generateStoryJson(story: Story, acceptanceCriteria?: AcceptanceCriterion[]): string {
  const acs = acceptanceCriteria || story.acceptance_criteria || [];
  const payload = {
    uuid: story.uuid,
    external_key: story.external_key,
    title: story.title,
    description: story.description,
    sprint: story.sprint,
    status: story.status,
    coverage_pct: Number(story.coverage_pct || 0),
    project_key: story.project_key,
    project_name: story.project_name,
    project_uuid: story.project_uuid,
    workflow_id: story.workflow_id,
    workflow_status: story.workflow_status,
    workflow_stage: story.workflow_stage,
    acceptance_criteria: acs.map((ac, idx) => ({
      uuid: ac.uuid,
      ac_key: ac.ac_key || `AC-${idx + 1}`,
      text: ac.text,
    })),
    exported_at: new Date().toISOString(),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Trigger client-side file download via Blob.
 */
export function downloadBlob(content: string, filename: string, mimeType = "text/markdown;charset=utf-8"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper to fetch complete story details (with ACs) and download immediately.
 */
export async function downloadStory(
  story: Story,
  format: "md" | "json" = "md"
): Promise<void> {
  let acs = story.acceptance_criteria;

  if (!acs) {
    try {
      const res = await storyApi.detail(story.uuid);
      acs = res.acceptance_criteria || [];
    } catch {
      acs = [];
    }
  }

  const key = story.external_key || "story";
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();

  if (format === "json") {
    const jsonStr = generateStoryJson(story, acs);
    downloadBlob(jsonStr, `${safeKey}-story.json`, "application/json;charset=utf-8");
  } else {
    const mdStr = generateStoryMarkdown(story, acs);
    downloadBlob(mdStr, `${safeKey}-story.md`, "text/markdown;charset=utf-8");
  }
}
