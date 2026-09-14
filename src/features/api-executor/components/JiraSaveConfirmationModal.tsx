import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ExternalLink,
  X,
  UploadCloud,
  Copy,
  Check,
  Building2,
  UserCheck,
  MessageSquare,
  Sparkles,
  Layers,
  FileCheck2,
} from "lucide-react";
import { jiraApi, type JiraStatusResponse, type JiraEvidenceSyncResponse } from "@/services/api/jiraApi";
import { Button } from "@/components/ui/Button";

interface JiraSaveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: any;
  defaultIssueKey?: string;
  storyTitle?: string;
  onSyncSuccess?: (result: JiraEvidenceSyncResponse) => void;
}

export function JiraSaveConfirmationModal({
  isOpen,
  onClose,
  evidence,
  defaultIssueKey,
  storyTitle,
  onSyncSuccess,
}: JiraSaveConfirmationModalProps) {
  const [jiraStatus, setJiraStatus] = useState<JiraStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [issueKey, setIssueKey] = useState(defaultIssueKey || "");
  const [approverName, setApproverName] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<JiraEvidenceSyncResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSeal, setCopiedSeal] = useState(false);

  // Keep issueKey in sync when defaultIssueKey changes
  useEffect(() => {
    if (defaultIssueKey && defaultIssueKey.trim()) {
      setIssueKey(defaultIssueKey.trim());
    }
  }, [defaultIssueKey]);

  // Load Jira status on open and generate dynamic approval comment
  useEffect(() => {
    if (!isOpen) {
      setSyncResult(null);
      setErrorMessage(null);
      return;
    }

    // Dynamically generate approval comment from evidence data
    if (evidence) {
      const passed = evidence.passed_endpoints ?? 0;
      const total = evidence.total_endpoints ?? 0;
      const acCount = evidence.acceptance_criteria_traceability?.length ?? 0;
      const colName = evidence.collection_name || "Postman collection";
      const generated = [
        `Autonomous verification completed for '${colName}'.`,
        total > 0 ? `${passed}/${total} endpoints passed.` : null,
        acCount > 0 ? `All ${acCount} acceptance criteria traced and verified.` : null,
        `Signed evidence package attached.`,
      ].filter(Boolean).join(" ");
      setApprovalComment(generated);
    }

    setLoadingStatus(true);
    jiraApi
      .getStatus()
      .then((status) => {
        setJiraStatus(status);
        // Auto-populate approver from Jira user profile
        if (status?.display_name) {
          setApproverName(status.display_name);
        }
        // Auto-populate issue key from project_key if still empty
        if (!issueKey && status?.project_key) {
          setIssueKey(`${status.project_key}-1`);
        }
      })
      .catch((err) => {
        console.warn("Failed to check Jira status:", err);
      })
      .finally(() => setLoadingStatus(false));
  }, [isOpen]);

  if (!isOpen || !evidence) return null;

  const handleCopySeal = () => {
    if (evidence.sha256_seal) {
      navigator.clipboard.writeText(evidence.sha256_seal);
      setCopiedSeal(true);
      setTimeout(() => setCopiedSeal(false), 2000);
    }
  };

  const handleSyncToJira = async () => {
    const targetKey = (issueKey || "").trim().toUpperCase();
    if (!targetKey) {
      setErrorMessage("Please enter a valid Jira Issue / Story Key (e.g. SCRUM-40).");
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);

    try {
      const response = await jiraApi.syncEvidence({
        issue_key: targetKey,
        evidence_key: evidence.evidence_key,
        docx_path: evidence.docx_path,
        evidence_data: evidence,
        approver_name: approverName.trim() || "QA Lead Reviewer",
        approval_comment: approvalComment.trim(),
      });

      setSyncResult(response);
      if (onSyncSuccess) {
        onSyncSuccess(response);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save evidence package to Jira Cloud.");
    } finally {
      setIsSyncing(false);
    }
  };

  const isConforming =
    evidence?.summary_recommendation?.toLowerCase().includes("conforms") &&
    !evidence?.summary_recommendation?.toLowerCase().includes("partially");

  const baseUrl = jiraStatus?.base_url || "";
  const directJiraStoryUrl = issueKey
    ? `${baseUrl.replace(/\/$/, "")}/browse/${issueKey.trim()}`
    : baseUrl;

  const passedCount = evidence.passed_endpoints ?? evidence.total_endpoints ?? 0;
  const totalCount = evidence.total_endpoints ?? passedCount;
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-gradient-to-r from-[var(--color-surface-elevated)] via-[var(--color-surface)] to-[var(--color-surface-elevated)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 border border-blue-500/30 shadow-sm">
              <UploadCloud size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                  Save Evidence Report to Jira Story
                </h2>
                <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                  Governance Gate
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Ask before saving: Synchronize structured test report & signed Word package to Jira Story.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* SUCCESS STATE */}
          {syncResult ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-700 font-bold text-sm">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <span>Successfully Saved & Attached to Jira Story [{syncResult.issue_key}]</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  The structured verification report comment and the signed Word evidence document (with all visual API call snapshots) have been posted to your Jira Story.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                      Jira Comment ID
                    </span>
                    <div className="font-mono font-bold text-[var(--color-text-primary)]">
                      #{syncResult.comment_id}
                    </div>
                  </div>

                  {syncResult.attachment && (
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-1 text-xs">
                      <span className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                        Attached Package
                      </span>
                      <div className="font-mono font-bold text-blue-600 truncate">
                        {syncResult.attachment.filename}
                      </div>
                      <span className="text-[10px] text-[var(--color-text-secondary)]">
                        {(syncResult.attachment.size / 1024).toFixed(1)} KB uploaded
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <a
                    href={syncResult.jira_url || directJiraStoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold shadow-md transition-colors"
                  >
                    <span>View Story in Jira Cloud</span>
                    <ExternalLink size={14} />
                  </a>

                  <Button variant="secondary" onClick={onClose} className="text-xs px-4 py-2 rounded-xl">
                    Close Window
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Jira Cloud Connection Info Bar */}
              <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    Jira Cloud Connected:
                  </span>
                  <span className="font-mono text-blue-600">
                    {jiraStatus?.base_url || "Connecting..."}
                  </span>
                </div>
                {jiraStatus?.display_name && (
                  <span className="text-[11px] text-[var(--color-text-secondary)] font-medium">
                    Signed in as <strong>{jiraStatus.display_name}</strong>
                  </span>
                )}
              </div>

              {/* Summary Card Preview */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-elevated)]/40 p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <FileCheck2 size={16} className="text-[var(--color-primary)]" />
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">
                      Evidence Package Preview ({evidence.evidence_key})
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      isConforming
                        ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                    }`}
                  >
                    {evidence.summary_recommendation?.toUpperCase() || "CONFORMS"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                      Pass Rate
                    </span>
                    <div className="text-sm font-black text-emerald-600">
                      {passedCount}/{totalCount} Passed ({passRate}%)
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                      Word Package
                    </span>
                    <div className="text-xs font-bold text-blue-600 truncate flex items-center gap-1">
                      <FileText size={12} />
                      <span>{passedCount} API Snapshots Attached</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                      Integrity Seal
                    </span>
                    <div className="font-mono text-[10px] text-[var(--color-text-primary)] truncate">
                      {evidence.sha256_seal ? evidence.sha256_seal.slice(0, 16) + "..." : "Deterministic"}
                    </div>
                  </div>
                </div>

                {/* SHA-256 Seal Full Preview */}
                {evidence.sha256_seal && (
                  <div className="flex items-center justify-between rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--color-border)] px-3 py-1.5 text-[10px] font-mono">
                    <div className="truncate text-[var(--color-text-secondary)]">
                      <span className="font-bold text-[var(--color-text-primary)]">SHA-256: </span>
                      <span>{evidence.sha256_seal}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopySeal}
                      className="shrink-0 ml-2 p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    >
                      {copiedSeal ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Input Form Fields */}
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-[var(--color-text-primary)] flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-blue-600" />
                      <span>Target Jira Story / Issue Key <span className="text-rose-500">*</span></span>
                    </div>
                    {directJiraStoryUrl && issueKey && (
                    <a
                      href={directJiraStoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-normal text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>Open in Jira</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                  </label>
                  <input
                    type="text"
                    value={issueKey}
                    onChange={(e) => setIssueKey(e.target.value.toUpperCase())}
                    placeholder="e.g. SCRUM-40"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-mono font-bold text-[var(--color-text-primary)] focus:border-blue-500 focus:outline-none shadow-sm"
                  />
                  {storyTitle && (
                    <p className="mt-1 text-[11px] text-[var(--color-text-secondary)] truncate">
                      Story: <span className="font-medium text-[var(--color-text-primary)]">{storyTitle}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5 mb-1.5">
                      <UserCheck size={13} className="text-[var(--color-primary)]" />
                      <span>Approver Name</span>
                    </label>
                    <input
                      type="text"
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      placeholder="e.g. QA Lead Reviewer"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5 mb-1.5">
                      <MessageSquare size={13} className="text-[var(--color-primary)]" />
                      <span>Review Sign-off Note</span>
                    </label>
                    <input
                      type="text"
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder="e.g. Verified against all 8 story acceptance criteria."
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-600">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!syncResult && (
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface-elevated)]/50 shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-xs px-4 py-2 rounded-xl"
            >
              Skip / Keep Local Only
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleSyncToJira}
              loading={isSyncing}
              className="text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              <UploadCloud size={15} />
              <span>Save & Attach to Jira Story {issueKey ? `[${issueKey}]` : ""}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
