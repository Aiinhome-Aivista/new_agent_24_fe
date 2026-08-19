import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Input } from "@/components/ui/Input";
import { projectApi } from "@/services/api/projectApi";
import { useToast } from "@/contexts/ToastContext";
import type { GitConnectionResult } from "@/types";
import { Plug, GitBranch, CheckCircle2, AlertCircle, Loader2, Sparkles, Server, ShieldAlert } from "lucide-react";

interface IntegrationItem {
  kind: string;
  provider: string;
  status: string;
  note: string;
  canTest?: boolean;
}

const INTEGRATIONS: IntegrationItem[] = [
  { kind: "Git / VCS", provider: "GitHub / Git HTTPS", status: "CONNECTED", note: "Live GitHub REST API adapter & branch validator", canTest: true },
  { kind: "ALM", provider: "Azure DevOps / Jira / Rally", status: "QUEUED", note: "Adapter interface ready · MOCK in dev" },
  { kind: "API Testing", provider: "Bruno / Postman (Newman)", status: "QUEUED", note: "Deterministic runner · MOCK in dev" },
  { kind: "Code Quality", provider: "SonarQube / Checkstyle / PMD", status: "QUEUED", note: "Analyzer adapter · MOCK in dev" },
];

export function IntegrationsPage() {
  const { notify } = useToast();
  const [testUrl, setTestUrl] = useState("https://github.com/torvalds/linux");
  const [testBranch, setTestBranch] = useState("master");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<GitConnectionResult | null>(null);

  const handleRunGitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUrl.trim()) {
      notify("error", "Please provide a Git repository URL");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await projectApi.testGitConnection({
        git_repo_url: testUrl.trim(),
        git_branch: testBranch.trim() || "main",
        git_provider: "github",
      });
      setTestResult(res);
      if (res.connected) {
        notify("success", res.message);
      } else {
        notify("error", res.message);
      }
    } catch (err) {
      const msg = (err as Error).message || "Connection test failed";
      setTestResult({
        connected: false,
        status: "NETWORK_ERROR",
        message: msg,
      });
      notify("error", msg);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="mb-1 font-display text-2xl font-semibold text-[var(--color-text-primary)]">Integrations</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Vendor-neutral adapters. Real credentials activate live mode; otherwise clearly-labeled MOCK adapters run.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {INTEGRATIONS.map((i) => (
          <Card key={i.kind} className="flex flex-col justify-between">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  {i.canTest ? <GitBranch size={16} /> : <Plug size={16} />}
                </div>
                <StatusBadge status={i.status} />
              </div>
              <p className="font-display font-semibold text-[var(--color-text-primary)]">{i.kind}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">{i.provider}</p>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{i.note}</p>
            </div>
            {i.canTest && (
              <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-secondary)]">Live Verification:</span>
                <span className="font-mono text-[var(--color-primary)] font-medium">Ready</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Interactive Git Connection Test Sandbox */}
      <Card className="border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Plug size={15} />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-[var(--color-text-primary)]">
              Git Repository Connection Tester
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Test live reachability, permissions, and branch verification against any GitHub or Git remote URL.
            </p>
          </div>
        </div>

        <form onSubmit={handleRunGitTest} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                Repository URL
              </label>
              <Input
                placeholder="https://github.com/owner/repo"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                Branch
              </label>
              <Input
                placeholder="main"
                value={testBranch}
                onChange={(e) => setTestBranch(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-1">
            <button
              type="submit"
              disabled={testing || !testUrl.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {testing ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Testing Remote Connection...
                </>
              ) : (
                <>
                  <Plug size={13} />
                  Run Connection Test
                </>
              )}
            </button>
          </div>
        </form>

        {testResult && (
          <div
            className={`mt-4 rounded-xl border p-3.5 text-xs transition-all ${
              testResult.connected
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {testResult.connected ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-sm">{testResult.connected ? "Connection Successful" : "Connection Failed"}</span>
                  {testResult.latency_ms !== undefined && (
                    <span className="font-mono text-xs opacity-80">{testResult.latency_ms}ms round-trip</span>
                  )}
                </div>
                <p className="text-xs leading-relaxed opacity-95">{testResult.message}</p>
                {testResult.connected && testResult.repo && (
                  <div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-[11px] opacity-85 border-t border-emerald-500/20 mt-2">
                    <span>Repository: {testResult.repo}</span>
                    <span>•</span>
                    <span>Target Branch: {testResult.branch}</span>
                    {testResult.default_branch && (
                      <>
                        <span>•</span>
                        <span>Default Branch: {testResult.default_branch}</span>
                      </>
                    )}
                    {testResult.is_private !== undefined && (
                      <>
                        <span>•</span>
                        <span>Visibility: {testResult.is_private ? "Private" : "Public"}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

