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
  if (res.status === 204) return undefined as Promise<T>;
  return res.json();
}

export interface AuthResponse {
  id: string;
  email: string;
  name: string;
}

export interface DigestSource {
  id: string;
  user_id: string;
  name: string;
  type: "rss" | "web_search";
  config: Record<string, string>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DigestInterest {
  id: string;
  user_id: string;
  label: string;
  created_at: string;
}

export interface ContentItem {
  id: string;
  user_id: string;
  product: "digest" | "compose" | "newsletter";
  status: "draft" | "approved" | "rejected";
  source_type: string | null;
  title: string | null;
  body_markdown: string | null;
  metadata: Record<string, unknown>;
  origin: "ai_generated" | "manual";
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
    save: (id: string, data: { title?: string; body_markdown?: string }) => request<{ status: string }>(`/content/${id}`, { method: "PUT", body: JSON.stringify(data) })
  },
  digest: {
    run: () => request<{ edition_id: string; item_count: number }>("/digest/run", { method: "POST" }),
    assembleEdition: (contentIDs?: string[]) =>
      request<{ edition_id: string; item_count: number }>("/digest/assemble-edition", {
        method: "POST",
        body: JSON.stringify({ content_ids: contentIDs ?? [] }),
      }),
    interests: {
      list: () => request<DigestInterest[]>("/digest/interests"),
      create: (label: string) =>
        request<DigestInterest>("/digest/interests", { method: "POST", body: JSON.stringify({ label }) }),
      delete: (id: string) =>
        request<void>("/digest/interests/" + id, { method: "DELETE" }),
    },
    sources: {
      list: () => request<DigestSource[]>("/digest/sources"),
      create: (data: { name: string; type: string; config: Record<string, string> }) =>
        request<DigestSource>("/digest/sources", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: { name: string; type: string; config: Record<string, string>; enabled: boolean }) =>
        request<DigestSource>("/digest/sources/" + id, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: string) =>
        request<void>("/digest/sources/" + id, { method: "DELETE" }),
    },
  },
  compose: {
    generateTopic: () =>
      request<{ edition_id: string; item_count: number }>("/compose/generate-topic", { method: "POST" }),
    generateDraft: (theme: string) =>
      request<{ edition_id: string; item_count: number }>("/compose/generate-draft", { method: "POST", body: JSON.stringify({ theme }) }),
    transform: (text: string, action: "expand" | "rewrite") =>
      request<{ edition_id: string; item_count: number }>("/compose/transform", { method: "POST", body: JSON.stringify({ text, action }) }),
    writeArticle: (data: { topic_id: string; voice: string }) =>
      request<{ edition_id: string; item_count: number }>("/compose/write", { method: "POST", body: JSON.stringify(data) }),
  },
};
