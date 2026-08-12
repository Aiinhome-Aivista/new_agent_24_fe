import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { projectApi } from "@/services/api/projectApi";
import { knowledgeApi } from "@/services/api/knowledgeApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import type { Project, KnowledgeDocument, KnowledgeChunk } from "@/types";
import {
  BookOpen, UploadCloud, Search, Trash2, FileText,
  ShieldCheck, Layers, Sparkles, X, Plus, FileCode, CheckCircle2
} from "lucide-react";

const DOC_TYPES = [
  { value: "user_story", label: "User Story" },
  { value: "acceptance_criteria", label: "Acceptance Criteria" },
  { value: "api_contract", label: "API Contract" },
  { value: "design_document", label: "Design Document" },
  { value: "service_catalogue", label: "Service Catalogue" },
  { value: "pojo_model", label: "POJO / Model" },
  { value: "coding_standards", label: "Coding Standards" },
  { value: "postman_collection", label: "Postman Collection" },
  { value: "bruno_collection", label: "Bruno Collection" },
  { value: "historical_evidence", label: "Historical Test Evidence" },
  { value: "other", label: "Other Document" },
];

export function KnowledgePage() {
  const [params, setParams] = useSearchParams();
  const { notify } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjUuid, setSelectedProjUuid] = useState<string>(params.get("project") ?? "");
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload Modal State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "text" | "collection">("file");
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("api_contract");
  const [version, setVersion] = useState("v1");
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // RAG Query Test State
  const [ragQuery, setRagQuery] = useState("");
  const [ragResults, setRagResults] = useState<KnowledgeChunk[]>([]);
  const [ragLoading, setRagLoading] = useState(false);

  // Load Projects on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await projectApi.list();
        const projs = res.projects ?? [];
        setProjects(projs);
        if (projs.length > 0) {
          const initial = params.get("project") || projs[0].uuid;
          setSelectedProjUuid(initial);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load Documents when selected project changes
  useEffect(() => {
    if (!selectedProjUuid) return;
    setParams({ project: selectedProjUuid });
    (async () => {
      setDocsLoading(true);
      try {
        const res = await knowledgeApi.list(selectedProjUuid);
        setDocuments(res.documents ?? []);
      } catch (e) {
        notify("error", (e as Error).message);
      } finally {
        setDocsLoading(false);
      }
    })();
  }, [selectedProjUuid]);

  const selectedProject = projects.find((p) => p.uuid === selectedProjUuid);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjUuid) return;
    setUploading(true);

    try {
      if (uploadMode === "file") {
        if (!selectedFile) {
          notify("error", "Select a file to upload");
          setUploading(false);
          return;
        }
        const fd = new FormData();
        fd.append("file", selectedFile);
        fd.append("doc_type", docType);
        fd.append("version", version);
        await knowledgeApi.upload(selectedProjUuid, fd);
      } else if (uploadMode === "collection") {
        if (!selectedFile) {
          notify("error", "Select a Postman/Bruno JSON file");
          setUploading(false);
          return;
        }
        const fd = new FormData();
        fd.append("file", selectedFile);
        await projectApi.uploadCollection(selectedProjUuid, fd);
      } else {
        if (!textContent.trim()) {
          notify("error", "Document text content is required");
          setUploading(false);
          return;
        }
        await knowledgeApi.uploadText(selectedProjUuid, {
          title: docTitle.trim() || `${docType}_doc.txt`,
          content: textContent,
          doc_type: docType,
          version,
        });
      }

      notify("success", "Document ingested, chunked, and indexed");
      setUploadOpen(false);
      setDocTitle("");
      setTextContent("");
      setSelectedFile(null);
      // Reload documents
      const res = await knowledgeApi.list(selectedProjUuid);
      setDocuments(res.documents ?? []);
    } catch (err) {
      notify("error", (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docUuid: string) => {
    if (!confirm("Are you sure you want to delete this document and its indexed chunks?")) return;
    try {
      await knowledgeApi.delete(docUuid);
      notify("success", "Document removed from knowledge base");
      setDocuments((prev) => prev.filter((d) => d.uuid !== docUuid));
    } catch (e) {
      notify("error", (e as Error).message);
    }
  };

  const handleTestRag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuery.trim() || !selectedProjUuid) return;
    setRagLoading(true);
    try {
      const res = await knowledgeApi.query(selectedProjUuid, ragQuery.trim(), 4);
      setRagResults(res.chunks ?? []);
      notify("info", `Retrieved ${res.chunks?.length ?? 0} project-scoped chunk(s)`);
    } catch (e) {
      notify("error", (e as Error).message);
    } finally {
      setRagLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const totalChunks = documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Project Knowledge Base</h1>
            <span className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
              RAG Scoped
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Project-isolated specifications, contracts, coding standards, and collections indexed for TDD generation.
          </p>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex items-center gap-3">
          <select
            value={selectedProjUuid}
            onChange={(e) => setSelectedProjUuid(e.target.value)}
            className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none">
            {projects.map((p) => (
              <option key={p.uuid} value={p.uuid}>
                {p.key_code} — {p.name}
              </option>
            ))}
          </select>

          <Button onClick={() => setUploadOpen(true)} className="flex items-center gap-1.5">
            <UploadCloud size={16} /> Upload Knowledge
          </Button>
        </div>
      </div>

      {/* Project Knowledge Stat Banner */}
      {selectedProject && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <Card className="flex items-center gap-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-[var(--color-primary)]">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Documents</p>
              <p className="font-display text-lg font-semibold text-[var(--color-text-primary)]">{documents.length}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Indexed Chunks</p>
              <p className="font-display text-lg font-semibold text-[var(--color-text-primary)]">{totalChunks}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <FileCode size={20} />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Stack</p>
              <p className="font-display text-xs font-semibold text-[var(--color-text-primary)] uppercase">
                {selectedProject.target_language || "Java"} / {selectedProject.target_framework || "JUnit5"}
              </p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Standards</p>
              <p className="font-display text-xs font-semibold text-[var(--color-text-primary)] truncate max-w-[120px]">
                {selectedProject.coding_standard || "Checkstyle"}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Document List Table */}
      <Card className="mb-6 overflow-hidden">
        <div className="border-b border-[var(--color-border)] px-5 py-3.5 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-[var(--color-text-primary)]">
            Indexed Documents for {selectedProject?.key_code}
          </h2>
          <span className="text-xs text-[var(--color-text-secondary)]">Strict project isolation enforced</span>
        </div>

        {docsLoading ? (
          <div className="p-8"><Loading /></div>
        ) : documents.length === 0 ? (
          <EmptyState
            title="No knowledge documents uploaded yet"
            hint="Upload API specifications, user stories, coding standards, or Postman collections to empower RAG test generation."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Document Title</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Version</th>
                  <th className="px-4 py-3 font-semibold">Chunks</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Uploaded</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-primary)]">
                {documents.map((doc) => (
                  <tr key={doc.uuid} className="hover:bg-[var(--color-surface-elevated)]/50 transition-colors">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <FileText size={15} className="text-[var(--color-primary)] shrink-0" />
                      <span className="truncate max-w-xs">{doc.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-[var(--color-surface-elevated)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                        {DOC_TYPES.find((t) => t.value === doc.doc_type)?.label || doc.doc_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]">{doc.version || "v1"}</td>
                    <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]">{doc.chunk_count}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.index_status === "indexed" ? "APPROVED" : "RUNNING"} />
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Recently"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(doc.uuid)}
                        className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Delete Document">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* RAG Interactive Test & Verification */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--color-primary)]" />
            <h2 className="font-display text-sm font-semibold text-[var(--color-text-primary)]">
              Live RAG Retrieval & Project Isolation Test
            </h2>
          </div>
          <span className="text-xs text-[var(--color-text-secondary)]">Queries only {selectedProject?.key_code} chunks</span>
        </div>

        <form onSubmit={handleTestRag} className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder={`Enter query terms (e.g. "discount code checkout limit")...`}
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
            />
          </div>
          <Button type="submit" loading={ragLoading} variant="secondary" className="flex items-center gap-1">
            <Search size={14} /> Search Knowledge
          </Button>
        </form>

        {ragResults.length > 0 && (
          <div className="mt-4 flex flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Retrieved Project Chunks ({ragResults.length})
            </p>
            {ragResults.map((chunk, idx) => (
              <div key={idx} className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 text-xs">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[var(--color-primary)]">Source: {chunk.source}</span>
                  <span className="text-[10px] text-[var(--color-text-secondary)]">Chunk #{idx + 1}</span>
                </div>
                <p className="whitespace-pre-wrap text-[var(--color-text-primary)] font-mono text-[11px] leading-relaxed">
                  {chunk.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl my-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud size={20} className="text-[var(--color-primary)]" />
                <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                  Add Knowledge Document
                </h2>
              </div>
              <button onClick={() => setUploadOpen(false)} className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]">
                <X size={18} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="mb-4 flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setUploadMode("file")}
                className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
                  uploadMode === "file" ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)]"
                }`}>
                File Upload
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("text")}
                className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
                  uploadMode === "text" ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)]"
                }`}>
                Paste Text
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("collection")}
                className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
                  uploadMode === "collection" ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)]"
                }`}>
                Postman/Bruno
              </button>
            </div>

            <form onSubmit={handleUpload} className="flex flex-col gap-3.5">
              {uploadMode !== "collection" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Document Type</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none">
                      {DOC_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Version</label>
                    <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1.0" className="text-xs" />
                  </div>
                </div>
              )}

              {uploadMode === "file" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                    File (PDF, DOCX, TXT, JSON, YAML, MD, CSV)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.markdown,.json,.yaml,.yml,.csv"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    required
                    className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 text-xs text-[var(--color-text-primary)] file:mr-2 file:rounded file:border-0 file:bg-[var(--color-primary)] file:px-2.5 file:py-1 file:text-xs file:text-black hover:file:opacity-90"
                  />
                </div>
              )}

              {uploadMode === "collection" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                    Postman or Bruno JSON Collection File
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    required
                    className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 text-xs text-[var(--color-text-primary)] file:mr-2 file:rounded file:border-0 file:bg-[var(--color-primary)] file:px-2.5 file:py-1 file:text-xs file:text-black hover:file:opacity-90"
                  />
                  <p className="mt-1.5 text-[11px] text-[var(--color-text-secondary)]">
                    Auto-extracts API endpoints, request bodies, and contracts into services while indexing in RAG.
                  </p>
                </div>
              )}

              {uploadMode === "text" && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Document Title</label>
                    <Input
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="e.g. checkout_business_rules.txt"
                      className="text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Content</label>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      rows={5}
                      placeholder="Paste requirement text, acceptance criteria, or coding standards..."
                      required
                      className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 font-mono text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="mt-3 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
                <Button type="submit" loading={uploading}>Ingest & Index</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
