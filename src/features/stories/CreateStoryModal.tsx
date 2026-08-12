import { useState } from "react";
import { storyApi } from "@/services/api/storyApi";
import type { Project } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import { X, BookPlus, Plus, Trash2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  projects: Project[];
  defaultProjectUuid?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateStoryModal({ isOpen, projects, defaultProjectUuid, onClose, onSuccess }: Props) {
  const { notify } = useToast();
  const [projectUuid, setProjectUuid] = useState(defaultProjectUuid || (projects[0]?.uuid ?? ""));
  const [externalKey, setExternalKey] = useState("");
  const [title, setTitle] = useState("");
  const [sprint, setSprint] = useState("Sprint 1");
  const [description, setDescription] = useState("");
  const [acs, setAcs] = useState<Array<{ ac_key: string; text: string }>>([
    { ac_key: "AC-1", text: "" },
    { ac_key: "AC-2", text: "" },
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const addAcRow = () => {
    setAcs((prev) => [...prev, { ac_key: `AC-${prev.length + 1}`, text: "" }]);
  };

  const removeAcRow = (idx: number) => {
    setAcs((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateAcText = (idx: number, text: string) => {
    setAcs((prev) => prev.map((item, i) => i === idx ? { ...item, text } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectUuid) {
      notify("error", "Please select a project");
      return;
    }
    if (!title.trim()) {
      notify("error", "Story title is required");
      return;
    }

    const filteredAcs = acs.filter((a) => a.text.trim().length > 0);
    setLoading(true);
    try {
      await storyApi.create({
        project_uuid: projectUuid,
        external_key: externalKey.trim() || undefined,
        title: title.trim(),
        description: description.trim(),
        sprint: sprint.trim(),
        acceptance_criteria: filteredAcs,
      });
      notify("success", "User Story & Acceptance Criteria created");
      onSuccess();
      onClose();
    } catch (err) {
      notify("error", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl my-8">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <BookPlus size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">New User Story</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Add requirement details and structured acceptance criteria</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Target Project</label>
              <select
                value={projectUuid}
                onChange={(e) => setProjectUuid(e.target.value)}
                required
                className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none">
                {projects.map((p) => (
                  <option key={p.uuid} value={p.uuid}>
                    {p.key_code} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">External Key (Optional)</label>
              <Input
                placeholder="e.g. ORD-102 (auto-generated if empty)"
                value={externalKey}
                onChange={(e) => setExternalKey(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Story Title</label>
              <Input
                placeholder="e.g. Cancel an unfulfilled order and issue instant refund"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Sprint / Milestone</label>
              <Input
                placeholder="e.g. Sprint 1"
                value={sprint}
                onChange={(e) => setSprint(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">User Story Description</label>
            <textarea
              placeholder="As a customer, I want to cancel my pending order so that payment is refunded and inventory is restored."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Acceptance Criteria ({acs.length})
              </label>
              <button
                type="button"
                onClick={addAcRow}
                className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline">
                <Plus size={14} /> Add Criterion
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {acs.map((ac, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 font-mono text-xs font-semibold text-[var(--color-text-secondary)]">
                    {ac.ac_key}:
                  </span>
                  <Input
                    placeholder={`Requirement for ${ac.ac_key} (e.g. Order in status PENDING can be cancelled)`}
                    value={ac.text}
                    onChange={(e) => updateAcText(idx, e.target.value)}
                    className="text-xs"
                  />
                  {acs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAcRow(idx)}
                      className="p-1.5 text-[var(--color-text-secondary)] hover:text-red-400">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2.5">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Save Story</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
