import { useState, useRef, useEffect } from "react";
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
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Code2,
  Layers,
  Edit3,
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

  // Wizard Step: "upload" -> "form"
  const [step, setStep] = useState<"upload" | "form">("upload");
  const [isDragging, setIsDragging] = useState(false);

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

  const isProjectLocked = Boolean(defaultProjectUuid) || projects.length <= 1;
  const activeProject =
    projects.find((p) => p.uuid === projectUuid) ||
    projects.find((p) => p.uuid === defaultProjectUuid) ||
    projects[0];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("upload");
      setStoryFile(null);
      setStoryFileContent("");
      setPostmanFile(null);
      setPostmanDetails(null);
      const targetUuid = defaultProjectUuid || (projects.length > 0 ? projects[0].uuid : "");
      if (targetUuid) {
        setProjectUuid(targetUuid);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Robust parsing helper for Story documents (.md, .txt, .json)
  const parseAndApplyStoryContent = (file: File, text: string) => {
    setStoryFile(file);
    setStoryFileContent(text);

    try {
      if (file.name.endsWith(".json")) {
        const parsed = JSON.parse(text);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.external_key) setExternalKey(parsed.external_key);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.sprint) setSprint(parsed.sprint);
        if (Array.isArray(parsed.acceptance_criteria)) {
          const parsedAcs = parsed.acceptance_criteria.map((item: any, i: number) => ({
            ac_key: typeof item === "object" ? item.ac_key || `AC-${i + 1}` : `AC-${i + 1}`,
            text: typeof item === "object" ? item.text || "" : String(item),
          }));
          if (parsedAcs.length > 0) setAcs(parsedAcs);
        }
        notify("success", `Extracted ${parsed.title || file.name} from JSON`);
        setStep("form");
        return;
      }

      // Robust Markdown / Text Parser
      let extractedKey = "";
      let extractedTitle = "";
      let extractedSprint = "";
      let extractedDesc = "";
      const foundAcs: Array<{ ac_key: string; text: string }> = [];

      // 1. Extract External Key: e.g. # [SBP-101] or | **Key** | SBP-101 | or Key: SBP-101
      const keyMatch =
        text.match(/#\s*\[([A-Za-z0-9_-]+)\]/i) ||
        text.match(/\|\s*\*\*Key\*\*\s*\|\s*([^|\r\n]+)\|/i) ||
        text.match(/Key:\s*([A-Za-z0-9_-]+)/i);
      if (keyMatch) extractedKey = keyMatch[1].trim();

      // 2. Extract Title: from first '# ' line or 'Title:' line
      const titleMatch =
        text.match(/#\s*(?:\[[^\]]+\])?\s*([^\r\n]+)/) ||
        text.match(/Title:\s*([^\r\n]+)/i);
      if (titleMatch) {
        extractedTitle = titleMatch[1].replace(/^[|:\s-]+/, "").trim();
      }

      // 3. Extract Sprint: e.g. | **Sprint** | POC.Phase 1.Sprint 3 | or Sprint: Sprint 1
      const sprintMatch =
        text.match(/\|\s*\*\*Sprint\*\*\s*\|\s*([^|\r\n]+)\|/i) ||
        text.match(/Sprint:\s*([^\r\n]+)/i);
      if (sprintMatch) extractedSprint = sprintMatch[1].trim();

      // 4. Extract Description Section: between ## Description and next ## header
      const descMatch = text.match(/##\s*Description\s*\n+([\s\S]*?)(?=\n##|$)/i);
      if (descMatch) {
        extractedDesc = descMatch[1]
          .split("\n")
          .filter((l) => !l.trim().startsWith("|") && !l.trim().startsWith("```"))
          .join("\n")
          .trim();
      }

      // 5. Extract Acceptance Criteria Section: between ## Acceptance Criteria and next ## header
      const acSectionMatch = text.match(/##\s*Acceptance Criteria\s*\n+([\s\S]*?)(?=\n##|$)/i);
      const searchScope = acSectionMatch ? acSectionMatch[1] : text;

      const lines = searchScope.split("\n").map((l) => l.trim()).filter(Boolean);
      lines.forEach((line) => {
        // Matches **AC-1:**, AC-1:, - AC-1, - **AC-1:**, 1. Given ..., etc.
        const acMatch =
          line.match(/^(?:[-*]\s*)?(?:\*\*)?(?:AC[-\s]?\d+[:.-]?|\d+\.)(?:\*\*)?\s*(.+)/i) ||
          (line.toLowerCase().startsWith("given ") ? [null, line] : null) ||
          (line.toLowerCase().startsWith("when ") ? [null, line] : null);

        if (acMatch && acMatch[1]) {
          const cleanText = acMatch[1].replace(/^\*\*|\*\*$/g, "").trim();
          if (cleanText && cleanText.length > 5) {
            foundAcs.push({
              ac_key: `AC-${foundAcs.length + 1}`,
              text: cleanText,
            });
          }
        }
      });

      // Fallback if no structured AC was found in section
      if (foundAcs.length === 0) {
        const rawLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        rawLines.forEach((line) => {
          if (
            /^(AC-\d+|\* AC|\- AC|\d+\.)/i.test(line) ||
            line.toLowerCase().startsWith("given ")
          ) {
            const cleanText = line
              .replace(/^(AC-\d+[:.-]?\s*|\* AC[:.-]?\s*|\- AC[:.-]?\s*|\d+\.\s*)/i, "")
              .trim();
            if (cleanText && cleanText.length > 5) {
              foundAcs.push({
                ac_key: `AC-${foundAcs.length + 1}`,
                text: cleanText,
              });
            }
          }
        });
      }

      if (extractedKey) setExternalKey(extractedKey);
      if (extractedTitle) setTitle(extractedTitle);
      if (extractedSprint) setSprint(extractedSprint);
      if (extractedDesc) setDescription(extractedDesc);
      if (foundAcs.length > 0) setAcs(foundAcs);

      const acMsg = foundAcs.length > 0 ? ` (${foundAcs.length} Acceptance Criteria)` : "";
      notify("success", `Parsed ${extractedKey || file.name}${acMsg}`);
      
      // Auto-transition to Step 2 (Form Review)
      setStep("form");
    } catch (err) {
      console.warn("Could not auto-parse story file", err);
      notify("warning", "File uploaded, but could not auto-parse all fields. Please fill manually.");
      setStep("form");
    }
  };

  // Handle Story File Upload
  const handleStoryFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      parseAndApplyStoryContent(file, text);
    };
    reader.readAsText(file);
  };

  // Handle Postman Collection File Upload (.json, .bru)
  const handlePostmanFileUpload = (file: File) => {
    setPostmanFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      if (file.name.endsWith(".bru")) {
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

      const postmanMsg = postmanFile ? " & Postman collection attached" : "";
      notify("success", `User Story saved successfully${postmanMsg}!`);
      onSuccess();
      onClose();
    } catch (err) {
      notify("error", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl flex flex-col overflow-hidden">
        
        {/* ========================================================================= */}
        {/* STEP 1: UPLOAD STORY DOCUMENT VIEW                                        */}
        {/* ========================================================================= */}
        {step === "upload" ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface-elevated)]/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-sm">
                  <UploadCloud size={22} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                    Upload User Story Document
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Upload your story file (.md, .txt, .json) to auto-extract Acceptance Criteria & metadata
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

            {/* Body */}
            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
              {/* Target Project: Show badge if already in a project, or dropdown if multiple projects */}
              {isProjectLocked ? (
                activeProject && (
                  <div className="flex items-center gap-2 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-3.5 py-2 text-xs">
                    <span className="text-[var(--color-text-secondary)] font-medium">Project:</span>
                    <span className="font-semibold text-[var(--color-primary)] font-mono">[{activeProject.key_code}]</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{activeProject.name}</span>
                  </div>
                )
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                    Target Project <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <select
                    value={projectUuid}
                    onChange={(e) => setProjectUuid(e.target.value)}
                    required
                    className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-input)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-neu-inset)] outline-none focus:border-[var(--color-primary)] font-medium"
                  >
                    {projects.map((p) => (
                      <option key={p.uuid} value={p.uuid}>
                        [{p.key_code}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Large Interactive Upload Dropzone */}
              <input
                ref={storyFileInputRef}
                type="file"
                accept=".md,.txt,.json,.docx"
                onClick={(e) => {
                  (e.target as HTMLInputElement).value = "";
                }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleStoryFileUpload(f);
                }}
                className="hidden"
                id="story-file-upload-step1"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleStoryFileUpload(f);
                }}
                onClick={() => storyFileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 text-center ${
                  isDragging
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 scale-[1.01]"
                    : "border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-surface-elevated)]/40 hover:bg-[var(--color-surface-elevated)]/70 shadow-[var(--shadow-neu-inset)]"
                }`}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] mb-3 shadow-inner">
                  <UploadCloud size={32} />
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                  Click to browse or drag & drop Story File
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mb-3">
                  Upload markdown documents (e.g. <span className="font-mono text-[var(--color-primary)]">SBP-101-Change-Password-Story.md</span>), Jira export tickets, or sprint files
                </p>
                <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-secondary)] font-mono">
                  <span className="rounded bg-[var(--color-surface)] px-2 py-0.5 border border-[var(--color-border)]">.MD</span>
                  <span className="rounded bg-[var(--color-surface)] px-2 py-0.5 border border-[var(--color-border)]">.TXT</span>
                  <span className="rounded bg-[var(--color-surface)] px-2 py-0.5 border border-[var(--color-border)]">.JSON</span>
                  <span className="rounded bg-[var(--color-surface)] px-2 py-0.5 border border-[var(--color-border)]">.DOCX</span>
                </div>
              </div>

              {/* Alternative Action: Manual Entry */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[var(--color-border)]"></div>
                <span className="flex-shrink mx-3 text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">
                  Or
                </span>
                <div className="flex-grow border-t border-[var(--color-border)]"></div>
              </div>

              <button
                type="button"
                onClick={() => setStep("form")}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] text-xs font-medium text-[var(--color-text-primary)] transition-colors group"
              >
                <Edit3 size={15} className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)]" />
                <span>Write user story manually without a file</span>
                <ArrowRight size={14} className="text-[var(--color-text-secondary)] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2.5 border-t border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface)] shrink-0">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* STEP 2: REVIEW & SAVE STORY FORM (NO REDUNDANT UPLOAD BOX)                */
          /* ========================================================================= */
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface-elevated)]/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <BookPlus size={20} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                    Review & Save User Story
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Verify auto-filled details, Acceptance Criteria, and attach API contracts
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
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              
              {/* Attached Source File Pill Banner (Clean & Non-Intrusive) */}
              {storyFile && (
                <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-2.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-success)]/15 text-[var(--color-success)]">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[var(--color-text-primary)]">{storyFile.name}</p>
                        <span className="rounded bg-[var(--color-primary)]/15 text-[var(--color-primary)] px-1.5 py-0.2 font-semibold text-[10px]">
                          {acs.filter(a => a.text.trim()).length} ACs Extracted
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--color-text-secondary)]">
                        {(storyFile.size / 1024).toFixed(1)} KB · Auto-extracted & pre-filled
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("upload");
                      if (storyFileInputRef.current) storyFileInputRef.current.value = "";
                    }}
                    className="text-[11px] text-[var(--color-primary)] hover:underline font-medium flex items-center gap-1"
                  >
                    Change File
                  </button>
                </div>
              )}

              {/* Section 1: Story Header Details */}
              {isProjectLocked ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                        Story Title <span className="text-[var(--color-error)]">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Change Password for Authenticated User"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                        External Key
                      </label>
                      <Input
                        placeholder="e.g. SBP-101"
                        value={externalKey}
                        onChange={(e) => setExternalKey(e.target.value.toUpperCase())}
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                      Sprint / Milestone
                    </label>
                    <Input
                      placeholder="e.g. POC.Phase 1.Sprint 3"
                      value={sprint}
                      onChange={(e) => setSprint(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                        Target Project <span className="text-[var(--color-error)]">*</span>
                      </label>
                      <select
                        value={projectUuid}
                        onChange={(e) => setProjectUuid(e.target.value)}
                        required
                        className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-neu-inset)] outline-none focus:border-[var(--color-primary)] font-medium"
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
                        External Key
                      </label>
                      <Input
                        placeholder="e.g. SBP-101"
                        value={externalKey}
                        onChange={(e) => setExternalKey(e.target.value.toUpperCase())}
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                        Story Title <span className="text-[var(--color-error)]">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Change Password for Authenticated User"
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
                </>
              )}

              {/* Section 3: Story Description */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  User Story Narrative & Business Context
                </label>
                <textarea
                  placeholder="As an authenticated user, I want to securely change my password..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-placeholder)] shadow-[var(--shadow-neu-inset)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* Section 4: Structured Acceptance Criteria */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                      Acceptance Criteria ({acs.length})
                    </label>
                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                      (TDD scenarios will be generated for each)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addAcRow}
                    className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
                  >
                    <Plus size={14} /> Add Criterion
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                  {acs.map((ac, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-12 shrink-0 font-mono text-xs font-bold text-[var(--color-primary)]">
                        {ac.ac_key}:
                      </span>
                      <Input
                        placeholder={`Requirement rule for ${ac.ac_key}`}
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
                        Upload Postman Collection (Optional)
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
                    className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-input)] cursor-pointer transition-all shadow-[var(--shadow-neu-inset)]"
                  >
                    <FileCode size={22} className="text-[var(--color-primary)] mb-1" />
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">
                      Upload Postman (.json) or Bruno (.bru) Collection
                    </span>
                    <span className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
                      Extracts request methods, URLs, payloads, and auto-registers API contracts
                    </span>
                  </label>
                ) : (
                  <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileCode size={16} className="text-[var(--color-primary)]" />
                        <div>
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {postmanDetails?.name || postmanFile.name}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-secondary)] ml-2">
                            ({(postmanFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                      </div>
                      <span className="rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 font-semibold text-[10px]">
                        {postmanDetails?.requestCount || 0} Request(s)
                      </span>
                    </div>

                    {postmanDetails?.endpoints && postmanDetails.endpoints.length > 0 && (
                      <div className="mt-1.5 space-y-1 bg-[var(--color-surface)]/80 p-2 rounded-lg border border-[var(--color-border)]">
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

            {/* Fixed Footer */}
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface)] shrink-0">
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <ArrowLeft size={14} /> Back to Upload
              </button>

              <div className="flex items-center gap-2.5">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={loading} disabled={!title.trim()}>
                  Save Story {postmanFile && "& Ingest Collection"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

