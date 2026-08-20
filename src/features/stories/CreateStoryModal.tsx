import { useState, useRef } from "react";
import { storyApi } from "@/services/api/storyApi";
import { projectApi } from "@/services/api/projectApi";
import { knowledgeApi } from "@/services/api/knowledgeApi";
import type { Project } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import {
  X,
  BookPlus,
  Plus,
  Trash2,
  UploadCloud,
  FileCode,
  FileText,
  CheckCircle2,
  Layers,
  Sparkles,
  ArrowRight,
  Code2,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  projects: Project[];
  defaultProjectUuid?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateStoryModal({
  isOpen,
  projects,
  defaultProjectUuid,
  onClose,
  onSuccess,
}: Props) {
  const { notify } = useToast();
  const [projectUuid, setProjectUuid] = useState(
    defaultProjectUuid || (projects[0]?.uuid ?? "")
  );
  const [externalKey, setExternalKey] = useState("");
  const [title, setTitle] = useState("");
  const [sprint, setSprint] = useState("Sprint 1");
  const [description, setDescription] = useState("");
  const [acs, setAcs] = useState<Array<{ ac_key: string; text: string }>>([
    { ac_key: "AC-1", text: "" },
    { ac_key: "AC-2", text: "" },
  ]);

  // Story Document Upload State
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyFileContent, setStoryFileContent] = useState<string>("");
  const storyFileInputRef = useRef<HTMLInputElement>(null);

  // Postman Collection Upload State
  const [postmanFile, setPostmanFile] = useState<File | null>(null);
  const [postmanDetails, setPostmanDetails] = useState<{
    name: string;
    requestCount: number;
    endpoints: string[];
  } | null>(null);
  const postmanInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Handle Story File Upload (.md, .txt, .json)
  const handleStoryFileUpload = (file: File) => {
    setStoryFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setStoryFileContent(text);

      // Auto-extract Title, Description, and ACs if possible
      try {
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          if (parsed.title) setTitle(parsed.title);
          if (parsed.external_key) setExternalKey(parsed.external_key);
          if (parsed.description) setDescription(parsed.description);
          if (parsed.sprint) setSprint(parsed.sprint);
          if (Array.isArray(parsed.acceptance_criteria)) {
            setAcs(
              parsed.acceptance_criteria.map((item: any, i: number) => ({
                ac_key: typeof item === "object" ? item.ac_key || `AC-${i + 1}` : `AC-${i + 1}`,
                text: typeof item === "object" ? item.text || "" : String(item),
              }))
            );
          }
        } else {
          // Parse Markdown / Text file lines
          const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
          const foundAcs: Array<{ ac_key: string; text: string }> = [];
          let descLines: string[] = [];
          let foundTitle = "";

          lines.forEach((line) => {
            if (!foundTitle && (line.startsWith("# ") || line.startsWith("Title:"))) {
              foundTitle = line.replace(/^(#\s*|Title:\s*)/i, "").trim();
            } else if (
              /^(AC-\d+|Acceptance Criteria|\* AC|\- AC|\d+\.)/i.test(line) ||
              line.toLowerCase().startsWith("given ") ||
              line.toLowerCase().startsWith("when ") ||
              line.toLowerCase().startsWith("then ")
            ) {
              const cleanText = line.replace(/^(AC-\d+[:.-]?\s*|\* AC[:.-]?\s*|\- AC[:.-]?\s*|\d+\.\s*)/i, "").trim();
              if (cleanText) {
                foundAcs.push({
                  ac_key: `AC-${foundAcs.length + 1}`,
                  text: cleanText,
                });
              }
            } else {
              descLines.push(line);
            }
          });

          if (foundTitle && !title) setTitle(foundTitle);
          if (descLines.length > 0 && !description) setDescription(descLines.slice(0, 5).join("\n"));
          if (foundAcs.length > 0) setAcs(foundAcs);
        }
        notify("success", `Parsed story content from ${file.name}`);
      } catch (err) {
        console.warn("Could not auto-parse story file", err);
      }
    };
    reader.readAsText(file);
  };

  // Handle Postman Collection File Upload (.json)
  const handlePostmanFileUpload = (file: File) => {
    setPostmanFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      if (file.name.endsWith(".bru")) {
        // Bruno format
        const methodMatch = text.match(/(get|post|put|delete|patch)\s*\{[^}]*url:\s*(\S+)/i);
        const method = methodMatch ? methodMatch[1].toUpperCase() : "GET";
        const url = methodMatch ? methodMatch[2] : "/api/endpoint";
        const colName = file.name.replace(".bru", "").replace(/_/g, " ");

        setPostmanDetails({
          name: `${colName} (Bruno)`,
          requestCount: 1,
          endpoints: [`${method} ${url}`],
        });
        notify("success", `Detected Bruno collection: ${method} ${url}`);
      } else {
        try {
          const json = JSON.parse(text);
          const colName = json.info?.name || file.name.replace(".json", "");
          const endpoints: string[] = [];

          const extractItems = (items: any[]) => {
            if (!Array.isArray(items)) return;
            items.forEach((item) => {
              if (item.request) {
                const method = item.request.method || "GET";
                const rawUrl =
                  typeof item.request.url === "string"
                    ? item.request.url
                    : item.request.url?.raw || item.name || "";
                endpoints.push(`${method} ${rawUrl}`);
              }
              if (item.item) {
                extractItems(item.item);
              }
            });
          };

          if (json.item) {
            extractItems(json.item);
          }

          setPostmanDetails({
            name: colName,
            requestCount: endpoints.length,
            endpoints: endpoints.slice(0, 5),
          });
          notify("success", `Detected Postman collection with ${endpoints.length} request(s)`);
        } catch {
          setPostmanDetails({
            name: file.name,
            requestCount: 0,
            endpoints: [],
          });
        }
      }
    };
    reader.readAsText(file);
  };

  const addAcRow = () => {
    setAcs((prev) => [...prev, { ac_key: `AC-${prev.length + 1}`, text: "" }]);
  };

  const removeAcRow = (idx: number) => {
    setAcs((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateAcText = (idx: number, text: string) => {
    setAcs((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, text } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectUuid) {
      notify("error", "Please select a target project");
      return;
    }
    if (!title.trim()) {
      notify("error", "Story title is required");
      return;
    }

    const filteredAcs = acs.filter((a) => a.text.trim().length > 0);
    setLoading(true);

    try {
      // 1. Create the User Story
      await storyApi.create({
        project_uuid: projectUuid,
        external_key: externalKey.trim() || undefined,
        title: title.trim(),
        description: description.trim(),
        sprint: sprint.trim(),
        acceptance_criteria: filteredAcs,
      });

      // 2. Upload Story Document to Knowledge Base if present
      if (storyFile) {
        try {
          const fd = new FormData();
          fd.append("file", storyFile);
          fd.append("doc_type", "user_story");
          fd.append("version", sprint.trim() || "v1");
          await knowledgeApi.upload(projectUuid, fd);
        } catch (err) {
          console.warn("Story file knowledge upload error", err);
        }
      }

      // 3. Upload Postman Collection if attached
      if (postmanFile) {
        const pfd = new FormData();
        pfd.append("file", postmanFile);
        await projectApi.uploadCollection(projectUuid, pfd);
      }

      const postmanMsg = postmanFile ? " & Postman collection ingested" : "";
      notify("success", `User Story created successfully${postmanMsg}!`);
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
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface-elevated)]/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <BookPlus size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                Create User Story & API Contracts
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Upload or enter user story, acceptance criteria, and attach Postman collection
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Section: Target Project & External Key */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Target Project <span className="text-[var(--color-error)]">*</span>
                </label>
                <select
                  value={projectUuid}
                  onChange={(e) => setProjectUuid(e.target.value)}
                  required
                  className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-neu-inset)] outline-none focus:border-[var(--color-border-orange)] font-medium"
                >
                  {projects.map((p) => (
                    <option key={p.uuid} value={p.uuid}>
                      [{p.key_code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  External Key (Optional)
                </label>
                <Input
                  placeholder="e.g. ORD-101"
                  value={externalKey}
                  onChange={(e) => setExternalKey(e.target.value.toUpperCase())}
                  className="font-mono text-xs uppercase"
                />
              </div>
            </div>

            {/* Section 1: Upload Story Document (Optional File Ingestion) */}
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)]/30 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-[var(--color-primary)]" />
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    Upload Story Document (Optional)
                  </span>
                </div>
                {storyFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setStoryFile(null);
                      setStoryFileContent("");
                      if (storyFileInputRef.current) storyFileInputRef.current.value = "";
                    }}
                    className="text-[11px] text-[var(--color-error)] hover:underline flex items-center gap-1"
                  >
                    <X size={12} /> Remove file
                  </button>
                )}
              </div>

              <input
                ref={storyFileInputRef}
                type="file"
                accept=".md,.txt,.json,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleStoryFileUpload(f);
                }}
                className="hidden"
                id="story-file-upload"
              />

              {!storyFile ? (
                <label
                  htmlFor="story-file-upload"
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/50 bg-[var(--color-input)]/50 cursor-pointer transition-colors"
                >
                  <UploadCloud size={20} className="text-[var(--color-text-secondary)] mb-1" />
                  <span className="text-xs font-medium text-[var(--color-text-primary)]">
                    Click or drag & drop User Story file (.md, .txt, .json)
                  </span>
                  <span className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
                    Automatically extracts Title, Description, and Acceptance Criteria into the fields below
                  </span>
                </label>
              ) : (
                <div className="flex items-center justify-between rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[var(--color-success)]" />
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">{storyFile.name}</p>
                      <p className="text-[10px] text-[var(--color-text-secondary)]">
                        {(storyFile.size / 1024).toFixed(1)} KB · Parsed and prefilled
                      </p>
                    </div>
                  </div>
                  <span className="rounded bg-[var(--color-success)]/10 text-[var(--color-success)] px-2 py-0.5 font-medium text-[10px]">
                    Attached
                  </span>
                </div>
              )}
            </div>

            {/* Section 2: Story Details (Title & Sprint) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Story Title <span className="text-[var(--color-error)]">*</span>
                </label>
                <Input
                  placeholder="e.g. Cancel pending order and process immediate refund"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Sprint / Milestone
                </label>
                <Input
                  placeholder="e.g. Sprint 1"
                  value={sprint}
                  onChange={(e) => setSprint(e.target.value)}
                />
              </div>
            </div>

            {/* Section 3: Story Description */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                User Story Narrative & Business Context
              </label>
              <textarea
                placeholder="As a customer, I want to cancel my pending order so that my funds are returned immediately without waiting for support..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-placeholder)] shadow-[var(--shadow-neu-inset)] outline-none focus:border-[var(--color-border-orange)]"
              />
            </div>

            {/* Section 4: Structured Acceptance Criteria */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                  Acceptance Criteria ({acs.length})
                </label>
                <button
                  type="button"
                  onClick={addAcRow}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
                >
                  <Plus size={14} /> Add Criterion
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {acs.map((ac, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-12 shrink-0 font-mono text-xs font-bold text-[var(--color-primary)]">
                      {ac.ac_key}:
                    </span>
                    <Input
                      placeholder={`Requirement rule for ${ac.ac_key} (e.g. Orders in PENDING status can be cancelled)`}
                      value={ac.text}
                      onChange={(e) => updateAcText(idx, e.target.value)}
                      className="text-xs flex-1"
                    />
                    {acs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAcRow(idx)}
                        className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 5: Dedicated Postman Collection Upload */}
            <div className="border-t border-[var(--color-border)] pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Code2 size={16} className="text-[var(--color-primary)]" />
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                      Upload Postman Collection
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)] ml-2">
                      (Auto-extracts API endpoints & schemas)
                    </span>
                  </div>
                </div>
                {postmanFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setPostmanFile(null);
                      setPostmanDetails(null);
                      if (postmanInputRef.current) postmanInputRef.current.value = "";
                    }}
                    className="text-[11px] text-[var(--color-error)] hover:underline flex items-center gap-1"
                  >
                    <X size={12} /> Remove collection
                  </button>
                )}
              </div>

              <input
                ref={postmanInputRef}
                type="file"
                accept=".json,.bru"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePostmanFileUpload(f);
                }}
                className="hidden"
                id="postman-collection-upload"
              />

              {!postmanFile ? (
                <label
                  htmlFor="postman-collection-upload"
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-input)] cursor-pointer transition-all shadow-[var(--shadow-neu-inset)]"
                >
                  <FileCode size={24} className="text-[var(--color-primary)] mb-1.5" />
                  <span className="text-xs font-medium text-[var(--color-text-primary)]">
                    Upload Postman (.json) or Bruno (.bru) Collection
                  </span>
                  <span className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                    Extracts request methods, URLs, payloads, and auto-registers API contracts for TDD generation
                  </span>
                </label>
              ) : (
                <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileCode size={18} className="text-[var(--color-primary)]" />
                      <div>
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {postmanDetails?.name || postmanFile.name}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-secondary)] ml-2">
                          ({(postmanFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    </div>
                    <span className="rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 font-semibold text-[10px]">
                      {postmanDetails?.requestCount || 0} Request(s)
                    </span>
                  </div>

                  {/* Endpoints Preview */}
                  {postmanDetails?.endpoints && postmanDetails.endpoints.length > 0 && (
                    <div className="mt-2 space-y-1 bg-[var(--color-surface)]/80 p-2 rounded-lg border border-[var(--color-border)]">
                      <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase">
                        Detected Endpoints:
                      </span>
                      <div className="space-y-0.5 font-mono text-[11px] text-[var(--color-text-primary)]">
                        {postmanDetails.endpoints.map((ep, i) => (
                          <div key={i} className="truncate">
                            • {ep}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fixed Footer with Action Buttons */}
          <div className="flex justify-end gap-2.5 border-t border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface)] shrink-0">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={!title.trim()}>
              Save Story {postmanFile && "& Ingest Collection"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
