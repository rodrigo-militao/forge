const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? "Request failed");
  }
  return res.json();
}

export interface AuthResponse {
  id: string;
  email: string;
  name: string;
}

export interface ContentItem {
  id: string;
  user_id: string;
  product: "digest" | "compose";
  status: "draft" | "approved" | "rejected";
  source_type: string | null;
  title: string | null;
  body_markdown: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; name: string }) =>
      request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    logout: () => request<{ status: string }>("/auth/logout", { method: "POST" }),
    me: () => request<AuthResponse>("/auth/me"),
  },
  content: {
    list: () => request<ContentItem[]>("/content"),
    approve: (id: string) => request<{ status: string }>(`/content/${id}/approve`, { method: "POST" }),
    reject: (id: string) => request<{ status: string }>(`/content/${id}/reject`, { method: "POST" }),
  },
  digest: {
    run: () => request<{ job_id: string; status: string }>("/digest/run", { method: "POST" }),
  },
  compose: {
    generateTopic: () =>
      request<{ job_id: string; status: string }>("/compose/generate-topic", { method: "POST" }),
    writeArticle: (data: { topic_id: string; voice: string }) =>
      request<{ job_id: string; status: string }>("/compose/write", { method: "POST", body: JSON.stringify(data) }),
  },
};
