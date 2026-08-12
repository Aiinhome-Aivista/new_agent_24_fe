import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Plug } from "lucide-react";

const INTEGRATIONS = [
  { kind: "ALM", provider: "Azure DevOps / Jira / Rally", status: "QUEUED", note: "Adapter interface ready · MOCK in dev" },
  { kind: "API Testing", provider: "Bruno / Postman (Newman)", status: "QUEUED", note: "Deterministic runner · MOCK in dev" },
  { kind: "Code Quality", provider: "SonarQube / Checkstyle / PMD", status: "QUEUED", note: "Analyzer adapter · MOCK in dev" },
  { kind: "Git", provider: "GitHub", status: "QUEUED", note: "Repository tool adapter" },
];

export function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 font-display text-2xl font-semibold text-[var(--color-text-primary)]">Integrations</h1>
      <p className="mb-6 text-sm text-[var(--color-text-secondary)]">Vendor-neutral adapters. Real credentials activate live mode; otherwise clearly-labeled MOCK adapters run.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {INTEGRATIONS.map((i) => (
          <Card key={i.kind}>
            <div className="mb-2 flex items-center justify-between">
              <Plug size={18} className="text-[var(--color-primary)]" />
              <StatusBadge status={i.status} />
            </div>
            <p className="font-display font-semibold text-[var(--color-text-primary)]">{i.kind}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">{i.provider}</p>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{i.note}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
