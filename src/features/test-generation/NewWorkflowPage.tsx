import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAsync } from "@/hooks/useAsync";
import { storyApi } from "@/services/api/storyApi";
import { workflowApi } from "@/services/api/workflowApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { useToast } from "@/contexts/ToastContext";
import { Check } from "lucide-react";

const CAPABILITIES = [
  "Requirement Analysis", "Service Analysis", "Test Planning", "Test Generation",
  "Code Generation", "API Execution", "Code Validation", "Evidence Generation", "ALM Attachment",
];

export function NewWorkflowPage() {
  const [params] = useSearchParams();
  const preselect = params.get("story") ?? "";
  const navigate = useNavigate();
  const { notify } = useToast();

  const { data, loading } = useAsync(() => storyApi.list(), []);
  const [storyUuid, setStoryUuid] = useState(preselect);
  const [caps, setCaps] = useState<string[]>(CAPABILITIES);
  const [starting, setStarting] = useState(false);

  const toggle = (c: string) => setCaps((cur) => cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]);

  const start = async () => {
    if (!storyUuid) { notify("error", "Select a story first"); return; }
    setStarting(true);
    try {
      const res = await workflowApi.start(storyUuid, caps);
      notify("success", `Workflow ${res.status}`);
      navigate(`/app/workflows/${res.workflow_id}`);
    } catch (e) {
      notify("error", (e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 font-display text-2xl font-semibold text-[var(--color-text-primary)]">New TDD Workflow</h1>
      <p className="mb-6 text-sm text-[var(--color-text-secondary)]">Select a story, choose capabilities, and start. Approval checkpoints are enforced automatically.</p>

      <Card className="mb-4">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">1 · User Story</h2>
        <div className="flex flex-col gap-2">
          {(data?.stories ?? []).map((s) => (
            <button key={s.uuid} onClick={() => setStoryUuid(s.uuid)}
              className="flex items-center justify-between rounded-[10px] border px-3 py-2 text-left transition-colors"
              style={{ borderColor: storyUuid === s.uuid ? "var(--color-primary)" : "var(--color-border)" }}>
              <span className="text-sm text-[var(--color-text-primary)]">
                <span className="font-mono text-xs text-[var(--color-primary)]">{s.external_key}</span> {s.title}
              </span>
              {storyUuid === s.uuid && <Check size={16} className="text-[var(--color-primary)]" />}
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">2 · Capabilities</h2>
        <div className="flex flex-wrap gap-2">
          {CAPABILITIES.map((c) => (
            <button key={c} onClick={() => toggle(c)}
              className="rounded-full border px-3 py-1.5 text-xs transition-colors"
              style={{
                borderColor: caps.includes(c) ? "var(--color-primary)" : "var(--color-border)",
                color: caps.includes(c) ? "var(--color-primary)" : "var(--color-text-secondary)",
                background: caps.includes(c) ? "color-mix(in srgb, var(--color-primary) 10%, transparent)" : "transparent",
              }}>
              {c}
            </button>
          ))}
        </div>
      </Card>

      <motion.div whileTap={{ scale: 0.99 }}>
        <Button onClick={start} loading={starting} className="w-full">Start Workflow</Button>
      </motion.div>
      <p className="mt-3 text-center text-xs text-[var(--color-text-secondary)]">
        Mandatory human checkpoints: Test Review · Evidence Review · ALM Attachment
      </p>
    </div>
  );
}
