import { apiClient, unwrap } from "./apiClient";
import type { AgentInfo } from "@/types";

export const agentApi = {
  list: () => unwrap<{ agents: AgentInfo[] }>(apiClient.get("/agents")),
  activity: () => unwrap<{ activity: unknown[] }>(apiClient.get("/agents/activity")),
};
