import { Card } from "@/components/ui/Card";
import type { CoverageMatrixItem, TestCase } from "@/types";
import {
  CheckCircle2,
  XCircle,
  BarChart3,
  Layers,
  FileCode,
  Target,
  FileText,
} from "lucide-react";

interface WorkflowCoverageTabProps {
  stateRealCoverage: any;
  coveragePct: number;
  totalAcs: number;
  coveredAcs: number;
  coverageMatrix: CoverageMatrixItem[];
  tests: TestCase[];
  onNavigateToTest: (testKey: string) => void;
}

export function WorkflowCoverageTab({
  stateRealCoverage,
  coveragePct,
  totalAcs,
  coveredAcs,
  coverageMatrix,
  tests,
  onNavigateToTest,
}: WorkflowCoverageTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span>Code Coverage &amp; Specification Traceability</span>
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Dual-layer coverage verification: Real line/branch execution coverage (pytest-cov) and Acceptance Criteria specification mapping.
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-mono font-bold ${
            stateRealCoverage?.line_coverage_pct != null
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : totalAcs > 0
              ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
              : "bg-zinc-800 border-zinc-700 text-zinc-400"
          }`}>
            {stateRealCoverage?.line_coverage_pct != null
              ? `${stateRealCoverage.line_coverage_pct}% Line Coverage (pytest-cov Verified)`
              : totalAcs > 0
              ? `${coveragePct}% Specification Covered (Pending Execution)`
              : "Pending Test Synthesis"}
          </span>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 mb-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1">
              <BarChart3 size={12} className="text-emerald-400" /> Line Coverage
            </span>
            <div className={`text-2xl font-bold font-mono ${
              stateRealCoverage?.line_coverage_pct != null ? "text-emerald-400" : "text-zinc-400 text-lg"
            }`}>
              {stateRealCoverage?.line_coverage_pct != null
                ? `${stateRealCoverage.line_coverage_pct}%`
                : totalAcs > 0
                ? "Pending Run"
                : "--"}
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] block">
              {stateRealCoverage?.line_coverage_pct != null
                ? "pytest-cov measured"
                : totalAcs > 0
                ? "Runs at Stage 9 (Code Validation)"
                : "Awaiting Test Synthesis"}
            </span>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1">
              <Layers size={12} className="text-blue-400" /> Branch Coverage
            </span>
            <div className={`text-2xl font-bold font-mono ${
              stateRealCoverage?.branch_coverage_pct != null ? "text-blue-400" : "text-zinc-400 text-lg"
            }`}>
              {stateRealCoverage?.branch_coverage_pct != null
                ? `${stateRealCoverage.branch_coverage_pct}%`
                : totalAcs > 0
                ? "Pending Run"
                : "--"}
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] block">
              {stateRealCoverage?.branch_coverage_pct != null
                ? "Conditional paths verified"
                : totalAcs > 0
                ? "Runs at Stage 9 (Code Validation)"
                : "Awaiting Test Synthesis"}
            </span>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1">
              <FileCode size={12} className="text-purple-400" /> Statements
            </span>
            <div className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
              {stateRealCoverage?.num_statements != null
                ? `${stateRealCoverage.num_statements - (stateRealCoverage.num_missing || 0)} / ${stateRealCoverage.num_statements}`
                : tests.length > 0
                ? `${tests.length} Scenarios`
                : "0 Scenarios"}
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] block">
              {stateRealCoverage?.num_missing
                ? `${stateRealCoverage.num_missing} missed`
                : stateRealCoverage?.num_statements != null
                ? "All statements verified"
                : tests.length > 0
                ? "Planned for execution"
                : "Awaiting Test Synthesis"}
            </span>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1">
              <Target size={12} className="text-amber-400" /> AC Specification
            </span>
            <div className="text-2xl font-bold font-mono text-amber-300">
              {coveredAcs}/{totalAcs}
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] block">
              {totalAcs > 0 ? `${coveragePct}% requirements mapped` : "Awaiting Test Synthesis"}
            </span>
          </div>
        </div>

        {/* Real Execution Scoped Files (if available) */}
        {stateRealCoverage?.covered_files && stateRealCoverage.covered_files.length > 0 && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                Verified Execution Source Files ({stateRealCoverage.covered_files.length})
              </span>
              <span className="text-[10px] font-mono text-emerald-300">pytest-cov Verified</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stateRealCoverage.covered_files.map((f: string, fidx: number) => (
                <span
                  key={fidx}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono text-emerald-300"
                >
                  <FileText size={12} />
                  <span>{f}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Acceptance Criteria Coverage Matrix Table */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-[var(--color-text-primary)]">
              Acceptance Criteria Traceability Matrix
            </h3>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
              {coveredAcs} of {totalAcs} Requirements Covered
            </span>
          </div>

          {coverageMatrix.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-xs text-[var(--color-text-secondary)]">
              No Acceptance Criteria mapped yet. Generated during Test Synthesis.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[#0d1117]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#161b22] text-[10px] uppercase font-bold text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="p-3 w-28">AC Identifier</th>
                    <th className="p-3">Requirement Description</th>
                    <th className="p-3 w-28 text-center">Status</th>
                    <th className="p-3">Mapped Test Scenarios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] font-mono text-[11px]">
                  {coverageMatrix.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-bold text-[var(--color-primary)]">
                        {item.ac_key}
                      </td>
                      <td className="p-3 font-sans text-zinc-200">
                        {item.requirement}
                      </td>
                      <td className="p-3 text-center">
                        {item.covered ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            <CheckCircle2 size={11} /> COVERED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-300">
                            <XCircle size={11} /> MISSING
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          {item.test_case_keys && item.test_case_keys.length > 0 ? (
                            item.test_case_keys.map((tk, kidx) => (
                              <button
                                key={kidx}
                                type="button"
                                onClick={() => onNavigateToTest(tk)}
                                className="rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors"
                              >
                                {tk} ➔
                              </button>
                            ))
                          ) : (
                            <span className="text-[10px] text-zinc-500">Auto-mapped</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
