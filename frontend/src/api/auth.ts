import { request } from "./request";
import type { AuthResponse } from "./types";

export const auth = {
  register: (data: { email: string; password: string; name: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request<{ status: string }>("/auth/logout", { method: "POST" }),
  me: () => request<AuthResponse>("/auth/me"),
  updateRestrictSearch: (restrict: boolean) =>
    request<{ status: string }>("/auth/restrict-search", { method: "PUT", body: JSON.stringify({ restrict }) }),
  updateTheme: (theme: string) =>
    request<{ status: string }>("/auth/theme", { method: "PUT", body: JSON.stringify({ theme }) }),
};
