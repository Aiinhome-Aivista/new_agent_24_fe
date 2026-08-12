import { useState } from "react";
import { projectApi } from "@/services/api/projectApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import { X, FolderPlus } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: Props) {
  const { notify } = useToast();
  const [keyCode, setKeyCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetLang, setTargetLang] = useState("java");
  const [targetFw, setTargetFw] = useState("junit5");
  const [codingStandard, setCodingStandard] = useState("checkstyle-google");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
        target_language: targetLang,
        target_framework: targetFw,
        coding_standard: codingStandard,
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
      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <FolderPlus size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Create Project</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Set up an isolated workspace for TDD generation</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Project Key</label>
              <Input
                placeholder="e.g. ORD"
                value={keyCode}
                onChange={(e) => setKeyCode(e.target.value.toUpperCase())}
                required
                maxLength={8}
                className="font-mono uppercase"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Project Name</label>
              <Input
                placeholder="e.g. Order Management Platform"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Description</label>
            <textarea
              placeholder="Describe the domain, capabilities, and purpose of this service…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50 focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Target Language</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none">
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="typescript">TypeScript</option>
                <option value="csharp">C# / .NET</option>
                <option value="go">Go</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Target Test Framework</label>
              <select
                value={targetFw}
                onChange={(e) => setTargetFw(e.target.value)}
                className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none">
                <option value="junit5">JUnit 5 + Mockito</option>
                <option value="pytest">Pytest</option>
                <option value="vitest">Vitest / Jest</option>
                <option value="nunit">NUnit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Coding Standard Enforcement</label>
            <select
              value={codingStandard}
              onChange={(e) => setCodingStandard(e.target.value)}
              className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none">
              <option value="checkstyle-google">Google Java Style / Checkstyle</option>
              <option value="pep8">PEP 8 / Flake8 Standard</option>
              <option value="eslint-standard">ESLint / Prettier Standard</option>
              <option value="strict-enterprise">Enterprise Strict (Zero Warning)</option>
            </select>
          </div>

          <div className="mt-2 flex justify-end gap-2.5">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Project</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
