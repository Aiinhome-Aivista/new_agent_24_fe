import axios, { AxiosInstance } from "axios";
import type { ApiEnvelope } from "@/types";

const BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

export const apiClient: AxiosInstance = axios.create({ baseURL: BASE, timeout: 30000 });

let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Unwrap the standard success/error envelope so callers get data directly.
export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const res = await promise;
  const body = res.data;
  if (!body.success) {
    throw new Error(body.error?.message ?? "Request failed");
  }
  return body.data;
}
