import { apiClient, unwrap } from "./apiClient";
import type { DashboardKpis } from "@/types";

export const dashboardApi = {
  kpis: () => unwrap<{ kpis: DashboardKpis }>(apiClient.get("/dashboard/kpis")),
  activity: () => unwrap<{ recent_workflows: unknown[] }>(apiClient.get("/dashboard/activity")),
};
