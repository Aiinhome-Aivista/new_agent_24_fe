import { useState } from "react";
import { projectApi } from "@/services/api/projectApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import type { GitConnectionResult } from "@/types";
import { X, FolderPlus, CheckCircle2, AlertCircle, Loader2, GitBranch, Plug } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STACK_FRAMEWORKS: Record<string, { label: string; value: string }[]> = {
  javascript: [
    { label: "React", value: "React" },
    { label: "Next.js", value: "Next.js" },
    { label: "NestJS (Node.js)", value: "NestJS" },
    { label: "Express.js (Node.js)", value: "Express" },
    { label: "Vue.js / Nuxt", value: "Vue.js" },
    { label: "Angular", value: "Angular" },
    { label: "Svelte / SvelteKit", value: "Svelte" },
  ],
  python: [
    { label: "FastAPI", value: "FastAPI" },
    { label: "Django", value: "Django" },
    { label: "Flask", value: "Flask" },
    { label: "PyTorch / AI Pipeline", value: "PyTorch" },
  ],
  java: [
    { label: "Spring Boot 3", value: "Spring Boot 3" },
    { label: "Quarkus", value: "Quarkus" },
    { label: "Micronaut", value: "Micronaut" },
    { label: "Jakarta EE", value: "Jakarta EE" },
  ],
  csharp: [
    { label: "ASP.NET Core Web API", value: "ASP.NET Core Web API" },
    { label: "ASP.NET Core MVC / Blazor", value: "ASP.NET Core Blazor" },
    { label: ".NET MAUI", value: ".NET MAUI" },
  ],
  go: [
    { label: "Gin", value: "Gin" },
    { label: "Echo", value: "Echo" },
    { label: "Fiber", value: "Fiber" },
    { label: "Chi", value: "Chi" },
  ],
};

const STACK_TESTING: Record<string, { label: string; value: string }[]> = {
  javascript: [
    { label: "Vitest / Jest + React Testing Library", value: "vitest" },
    { label: "Jest", value: "jest" },
    { label: "Playwright / Cypress", value: "playwright" },
    { label: "Mocha + Chai", value: "mocha" },
  ],
  python: [
    { label: "Pytest + pytest-mock", value: "pytest" },
    { label: "Unittest", value: "unittest" },
    { label: "Robot Framework", value: "robot" },
  ],
  java: [
    { label: "JUnit 5 + Mockito", value: "junit5" },
    { label: "TestNG", value: "testng" },
  ],
  csharp: [
    { label: "NUnit 3 + Moq", value: "nunit" },
    { label: "xUnit.net", value: "xunit" },
    { label: "MSTest", value: "mstest" },
  ],
  go: [
    { label: "Go Test + Testify", value: "gotest" },
    { label: "Ginkgo + Gomega", value: "ginkgo" },
  ],
};

export function CreateProjectModal({ isOpen, onClose, onSuccess }: Props) {
  const { notify } = useToast();
  const [keyCode, setKeyCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gitRepoUrl, setGitRepoUrl] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [testingGit, setTestingGit] = useState(false);
  const [gitTestResult, setGitTestResult] = useState<GitConnectionResult | null>(null);
  const [targetLang, setTargetLang] = useState("javascript");
  const [framework, setFramework] = useState("React");
  const [appType, setAppType] = useState("Fullstack Web Application");
  const [testingFw, setTestingFw] = useState("vitest");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleTestGitConnection = async () => {
    if (!gitRepoUrl.trim()) {
      notify("error", "Please enter a GitHub repository URL first");
      return;
    }
    setTestingGit(true);
    setGitTestResult(null);
    try {
      const res = await projectApi.testGitConnection({
        git_repo_url: gitRepoUrl.trim(),
        git_branch: gitBranch.trim() || "main",
        git_provider: "github",
      });
      setGitTestResult(res);
      if (res.connected) {
        notify("success", res.message);
      } else {
        notify("error", res.message);
      }
    } catch (err) {
      const msg = (err as Error).message || "Failed to test Git connection";
      setGitTestResult({
        connected: false,
        status: "NETWORK_ERROR",
        message: msg,
      });
      notify("error", msg);
    } finally {
      setTestingGit(false);
    }
  };

  const handleStackChange = (lang: string) => {
    setTargetLang(lang);
    const availableFws = STACK_FRAMEWORKS[lang] || [];
    if (availableFws.length > 0) {
      setFramework(availableFws[0].value);
    }
    const availableTesting = STACK_TESTING[lang] || [];
    if (availableTesting.length > 0) {
      setTestingFw(availableTesting[0].value);
    }
  };

  const currentFrameworks = STACK_FRAMEWORKS[targetLang] || [];
  const currentTestingFws = STACK_TESTING[targetLang] || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyCode.trim() || !name.trim()) {
      notify("error", "Project key and name are required");
      return;
    }

    setLoading(true);
    try {
      await projectApi.create({
        key_code: keyCode.toUpperCase().trim(),
        name: name.trim(),
        description: description.trim(),
        git_provider: "github",
        git_repo_url: gitRepoUrl.trim() || undefined,
        git_branch: gitBranch.trim() || "main",
        target_language: targetLang,
        tech_stack: `${targetLang} (${framework})`,
        backend_framework: framework,
        frontend_framework: framework === "React" || framework === "Next.js" || framework === "Vue.js" || framework === "Angular" || framework === "Svelte" ? framework : undefined,
        app_type: appType,
        target_framework: testingFw,
        testing_framework: testingFw,
      });

      notify("success", `Project ${keyCode.toUpperCase()} created successfully`);
      onSuccess();
      onClose();
    } catch (err) {
      notify("error", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl max-h-[88vh] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface-elevated)]/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <FolderPlus size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Create Project</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Set up project info, GitHub repository, stack, framework, and testing</p>
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Section 1: Basic Project Information */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                1. Basic Project Information
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                    Project Key <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <Input
                    placeholder="e.g. ORD"
                    value={keyCode}
                    onChange={(e) => setKeyCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                    required
                    maxLength={8}
                    className="font-mono uppercase font-bold text-[var(--color-primary)]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                    Project Name <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Order Management Platform"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mt-2.5">
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Description</label>
                <textarea
                  placeholder="Describe the domain, capabilities, and purpose of this service…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-placeholder)] shadow-[var(--shadow-neu-inset)] outline-none transition-colors focus:border-[var(--color-border-orange)]"
                />
              </div>
            </div>

            {/* Section 2: Git Repository & Branch Information (GitHub Only) */}
            <div className="border-t border-[var(--color-border)] pt-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
                  <GitBranch size={13} />
                  2. GitHub Repository & Branch
                </div>
                {gitRepoUrl.trim() && (
                  <button
                    type="button"
                    onClick={handleTestGitConnection}
                    disabled={testingGit}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50 transition-colors"
                  >
                    {testingGit ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <Plug size={12} />
                        Test Connection
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                    GitHub Repository URL
                  </label>
                  <Input
                    placeholder="https://github.com/org/repo"
                    value={gitRepoUrl}
                    onChange={(e) => {
                      setGitRepoUrl(e.target.value);
                      if (gitTestResult) setGitTestResult(null);
                    }}
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                    Branch
                  </label>
                  <Input
                    placeholder="main"
                    value={gitBranch}
                    onChange={(e) => {
                      setGitBranch(e.target.value);
                      if (gitTestResult) setGitTestResult(null);
                    }}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {/* Git Connectivity Status Feedback */}
              {testingGit && (
                <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-secondary)] animate-pulse">
                  <Loader2 size={14} className="animate-spin text-[var(--color-primary)]" />
                  <span>Connecting to GitHub remote to verify repository and branch '{gitBranch || "main"}'...</span>
                </div>
              )}

              {gitTestResult && !testingGit && (
                <div
                  className={`mt-2.5 rounded-lg border p-2.5 text-xs transition-all ${
                    gitTestResult.connected
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {gitTestResult.connected ? (
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span>{gitTestResult.connected ? "Connection Verified" : "Connection Failed"}</span>
                        {gitTestResult.latency_ms !== undefined && gitTestResult.latency_ms > 0 && (
                          <span className="font-mono text-[10px] opacity-80">
                            {gitTestResult.latency_ms}ms
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">{gitTestResult.message}</p>
                      {gitTestResult.connected && gitTestResult.repo && (
                        <div className="flex items-center gap-2 pt-1 font-mono text-[10px] opacity-80">
                          <span>Repo: {gitTestResult.repo}</span>
                          <span>•</span>
                          <span>Branch: {gitTestResult.branch}</span>
                          {gitTestResult.is_private !== undefined && (
                            <>
                              <span>•</span>
                              <span>{gitTestResult.is_private ? "Private" : "Public"}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Technology Stack & Dynamic Framework (Language-specific) */}
            <div className="border-t border-[var(--color-border)] pt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                3. Technology Stack & Framework
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                    Technology Stack
                  </label>
                  <select
                    value={targetLang}
                    onChange={(e) => handleStackChange(e.target.value)}
                    className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-neu-inset)] outline-none focus:border-[var(--color-border-orange)]"
                  >
                    <option value="javascript">JavaScript / TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="csharp">C# / .NET</option>
                    <option value="go">Go</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                    Framework
                  </label>
                  <select
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                    className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-neu-inset)] outline-none focus:border-[var(--color-border-orange)] font-medium"
                  >
                    {currentFrameworks.map((fw) => (
                      <option key={fw.value} value={fw.value}>
                        {fw.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: Application Type & Testing Framework */}
            <div className="border-t border-[var(--color-border)] pt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                4. Application Type & Testing Framework
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                    Application Type
                  </label>
                  <select
                    value={appType}
                    onChange={(e) => setAppType(e.target.value)}
                    className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-neu-inset)] outline-none focus:border-[var(--color-border-orange)]"
                  >
                    <option value="REST API / Microservice">REST API / Microservice</option>
                    <option value="Fullstack Web Application">Fullstack Web Application</option>
                    <option value="Single Page App (SPA)">Single Page App (SPA)</option>
                    <option value="Event-Driven / Worker">Event-Driven / Worker</option>
                    <option value="GraphQL API">GraphQL API</option>
                    <option value="CLI / Background Service">CLI / Background Service</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                    Testing Framework
                  </label>
                  <select
                    value={testingFw}
                    onChange={(e) => setTestingFw(e.target.value)}
                    className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-neu-inset)] outline-none focus:border-[var(--color-border-orange)]"
                  >
                    {currentTestingFws.map((tf) => (
                      <option key={tf.value} value={tf.value}>
                        {tf.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer with Action Buttons */}
          <div className="flex justify-end gap-2.5 border-t border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface)] shrink-0">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={!keyCode.trim() || !name.trim()}>
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
