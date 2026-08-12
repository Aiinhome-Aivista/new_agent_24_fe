import { motion } from "framer-motion";
import { useAsync } from "@/hooks/useAsync";
import { dashboardApi } from "@/services/api/dashboardApi";
import { KpiCard } from "@/components/ui/KpiCard";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { stagger } from "@/styles/motion";
import { Activity, CheckCircle2, FlaskConical, GaugeCircle, ShieldAlert, FileCheck2 } from "lucide-react";
import { Link } from "react-router-dom";

export function DashboardPage() {
  const kpis = useAsync(() => dashboardApi.kpis(), []);
  const activity = useAsync(() => dashboardApi.activity(), []);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 font-display text-2xl font-semibold text-[var(--color-text-primary)]">Dashboard</h1>
      <p className="mb-6 text-sm text-[var(--color-text-secondary)]">What's happening, what needs attention, and what to do next.</p>

      {kpis.loading ? <Loading /> : kpis.error ? <ErrorState message={kpis.error} onRetry={kpis.reload} /> : kpis.data && (
        <motion.div initial="initial" animate="animate" variants={stagger}
          className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <KpiCard label="Active Workflows" value={kpis.data.kpis.active_workflows} icon={<Activity size={16} />} />
          <KpiCard label="Pending Approvals" value={kpis.data.kpis.pending_approvals} icon={<ShieldAlert size={16} />} />
          <KpiCard label="Tests Executed" value={kpis.data.kpis.tests_executed} icon={<FlaskConical size={16} />} />
          <KpiCard label="Pass Rate" value={kpis.data.kpis.pass_rate} suffix="%" icon={<CheckCircle2 size={16} />} />
          <KpiCard label="Requirement Coverage" value={kpis.data.kpis.requirement_coverage} suffix="%" icon={<GaugeCircle size={16} />} />
          <KpiCard label="Evidence Ready" value={kpis.data.kpis.evidence_ready} icon={<FileCheck2 size={16} />} />
        </motion.div>
      )}

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Active TDD Workflows</h2>
          <Link to="/app/workflows" className="text-sm text-[var(--color-primary)] hover:underline">View all</Link>
        </div>
        {activity.loading ? <Loading /> : activity.error ? <ErrorState message={activity.error} onRetry={activity.reload} /> : (
          <div className="flex flex-col gap-2">
            {((activity.data?.recent_workflows as { workflow_id: string; status: string; current_stage: string; story_title: string }[]) ?? []).map((w) => (
              <Link key={w.workflow_id} to={`/app/workflows/${w.workflow_id}`}>
                <Card className="flex items-center justify-between transition-colors hover:border-[var(--color-border-orange)]">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{w.story_title}</p>
                    <p className="font-mono text-xs text-[var(--color-text-secondary)]">{w.current_stage.replace(/_/g, " ")}</p>
                  </div>
                  <StatusBadge status={w.status} />
                </Card>
              </Link>
            ))}
            {(!activity.data?.recent_workflows || (activity.data.recent_workflows as unknown[]).length === 0) && (
              <Card><p className="text-sm text-[var(--color-text-secondary)]">No workflows yet. Start one from New Workflow.</p></Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
