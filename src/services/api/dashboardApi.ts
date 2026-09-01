import { apiClient, unwrap } from "./apiClient";
import type { DashboardKpis } from "@/types";

let kpiPromise: Promise<{ kpis: DashboardKpis }> | null = null;
let activityPromise: Promise<{ recent_workflows: unknown[] }> | null = null;

export const dashboardApi = {
  kpis: (): Promise<{ kpis: DashboardKpis }> => {
    if (kpiPromise) return kpiPromise;
    kpiPromise = unwrap<{ kpis: DashboardKpis }>(apiClient.get("/dashboard/kpis"))
      .finally(() => {
        setTimeout(() => { kpiPromise = null; }, 2000);
      });
    return kpiPromise;
  },

  activity: (): Promise<{ recent_workflows: unknown[] }> => {
    if (activityPromise) return activityPromise;
    activityPromise = unwrap<{ recent_workflows: unknown[] }>(apiClient.get("/dashboard/activity"))
      .finally(() => {
        setTimeout(() => { activityPromise = null; }, 2000);
      });
    return activityPromise;
  },
};

