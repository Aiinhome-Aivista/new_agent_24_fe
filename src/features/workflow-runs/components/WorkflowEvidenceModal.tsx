import { Button } from "@/components/ui/Button";
import { workflowApi } from "@/services/api/workflowApi";
import type { EvidencePackage } from "@/types";
import {
  FileText,
  Eye,
  Code2,
  Copy,
  Check,
  XCircle,
  RefreshCw,
  Download,
  ExternalLink,
} from "lucide-react";

interface WorkflowEvidenceModalProps {
  selectedEvidence: EvidencePackage | null;
  onClose: () => void;
  evidenceViewMode: "document" | "markdown";
  onViewModeChange: (mode: "document" | "markdown") => void;
  evidenceLoading: boolean;
  evidenceHtml: string | null;
  workflowId: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

export function WorkflowEvidenceModal({
  selectedEvidence,
  onClose,
  evidenceViewMode,
  onViewModeChange,
  evidenceLoading,
  evidenceHtml,
  workflowId,
  copiedKey,
  onCopy,
}: WorkflowEvidenceModalProps) {
  if (!selectedEvidence) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6">
      <div className="w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-2xl flex flex-col h-[90vh] max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                  {selectedEvidence.evidence_key}
                </h3>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400 font-semibold">
                  Deterministic Proof
                </span>
              </div>
              <p className="text-[11px] font-mono text-[var(--color-text-secondary)] mt-0.5">
                SHA-256: {selectedEvidence.checksum}
              </p>
            </div>
          </div>

          {/* View Switcher & Action Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1">
              <button
                type="button"
                onClick={() => onViewModeChange("document")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  evidenceViewMode === "document"
                    ? "bg-[var(--color-primary)] text-white shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:text-white"
                }`}
              >
                <Eye size={13} />
                <span>Document View</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("markdown")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  evidenceViewMode === "markdown"
                    ? "bg-[var(--color-primary)] text-white shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:text-white"
                }`}
              >
                <Code2 size={13} />
                <span>Raw Markdown</span>
              </button>
            </div>

            {evidenceViewMode === "markdown" && (
              <Button
                variant="secondary"
                onClick={() =>
                  onCopy(
                    selectedEvidence.content || selectedEvidence.narrative || "",
                    "modal-evid"
                  )
                }
                className="flex items-center gap-1.5 text-xs py-1.5 px-2.5"
              >
                {copiedKey === "modal-evid" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedKey === "modal-evid" ? "Copied" : "Copy"}</span>
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={onClose}
              className="p-1.5 text-xs"
            >
              <XCircle size={18} />
            </Button>
          </div>
        </div>

        {/* Modal Body */}
        {evidenceViewMode === "document" ? (
          <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[#0f172a] shadow-inner flex items-center justify-center">
            {evidenceLoading && !evidenceHtml ? (
              <div className="flex flex-col items-center gap-3 text-[var(--color-text-secondary)]">
                <RefreshCw className="animate-spin text-[var(--color-primary)]" size={28} />
                <span className="text-xs font-semibold">Rendering Interactive Verification Report...</span>
              </div>
            ) : evidenceHtml ? (
              <iframe
                srcDoc={evidenceHtml}
                title={`Evidence Document - ${selectedEvidence.evidence_key}`}
                className="w-full h-full border-0 rounded-xl"
              />
            ) : (
              <iframe
                src={workflowApi.getEvidenceDownloadUrl(workflowId, "html", true)}
                title={`Evidence Document - ${selectedEvidence.evidence_key}`}
                className="w-full h-full border-0 rounded-xl"
              />
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[#0d1117] p-5 text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed shadow-inner">
            {selectedEvidence.content || selectedEvidence.narrative || "# No evidence content available"}
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={workflowApi.getEvidenceDownloadUrl(workflowId, "docx")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white transition-colors shadow-sm"
            >
              <Download size={13} />
              <span>Download .DOCX Package</span>
            </a>
            <a
              href={workflowApi.getEvidenceDownloadUrl(workflowId, "html")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-white transition-colors"
            >
              <Download size={13} />
              <span>Download HTML</span>
            </a>
            <a
              href={workflowApi.getEvidenceDownloadUrl(workflowId, "html", true)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-white transition-colors"
            >
              <ExternalLink size={13} />
              <span>Open in New Tab</span>
            </a>
          </div>

          <Button onClick={onClose} className="text-xs font-semibold">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
