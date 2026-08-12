import { apiClient, unwrap } from "./apiClient";
import type { User } from "@/types";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string) =>
    unwrap<LoginResponse>(apiClient.post("/login", { email, password })),
  me: () => unwrap<User>(apiClient.get("/me")),
  refresh: (refresh_token: string) =>
    unwrap<{ access_token: string }>(apiClient.post("/refresh", { refresh_token })),
  logout: () => unwrap(apiClient.post("/logout")),
};
