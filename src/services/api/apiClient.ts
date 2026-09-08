import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import type { ApiEnvelope } from "@/types";

const BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

export const apiClient: AxiosInstance = axios.create({ baseURL: BASE, timeout: 3000000 });

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/login") || originalRequest?.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      const refreshToken = localStorage.getItem("tdd-refresh");
      if (!refreshToken) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post(`${BASE}/auth/refresh`, { refresh_token: refreshToken });
        const data = refreshRes.data?.data;
        const newAccessToken = data?.access_token;

        if (newAccessToken) {
          setAccessToken(newAccessToken);
          if (data?.refresh_token) {
            localStorage.setItem("tdd-refresh", data.refresh_token);
          }
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } else {
          processQueue(error, null);
          localStorage.removeItem("tdd-refresh");
          return Promise.reject(error);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem("tdd-refresh");
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Unwrap the standard success/error envelope so callers get data directly.
export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const res = await promise;
  const body = res.data;
  if (!body.success) {
    throw new Error(body.error?.message ?? "Request failed");
  }
  return body.data;
}
