const BASE = "/api";

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

function friendlyError(status: number): string {
  switch (status) {
    case 400: return "Invalid request. Check your input.";
    case 403: return "You don't have permission.";
    case 404: return "Not found.";
    case 429: return "Too many requests. Please wait.";
    case 500: return "Server error. Please try again.";
    default: return "Request failed. Try again.";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const merged: RequestInit = {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
    signal: options?.signal || controller.signal,
  };

  let res: Response;
  try {
    res = await fetch(BASE + path, merged);
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out. Check your connection.");
    }
    throw new Error("Network error. Check your connection.");
  }
  clearTimeout(timeout);

  if (res.status === 401) {
    onUnauthorized?.();
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
    if (currentPath !== "/login" && currentPath !== "/register" && currentPath !== "/") {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("redirectAfterLogin", currentPath);
      }
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? friendlyError(res.status));
  }
  if (res.status === 204) return undefined as unknown as Promise<T>;
  return res.json();
}

export interface AuthResponse {
  id: string;
  email: string;
  name: string;
  plano_ativo: boolean;
  max_active_sources: number;
  max_active_interests: number;
  restrict_search_to_sources: boolean;
  max_monthly_generations: number;
  usage_this_month: number;
  locale: string;
  theme_preference: string;
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
  enabled: boolean;
  created_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  context: string | null;
  notes: string | null;
  references: string | null;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "used" | "archived";
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  user_id: string;
  product: "digest" | "compose" | "newsletter";
  status: "draft" | "published" | "discarded";
  source_type: string | null;
  title: string | null;
  body_markdown: string | null;
  outline: string | null;
  metadata: Record<string, unknown>;
  origin: "ai_generated" | "manual";
  categories: string[];
  tags: string[];
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleRef {
  content_id: string;
  title: string;
  body_markdown: string;
  added_at: string;
}

export interface NewsletterEdition {
  id: string;
  user_id: string;
  title: string;
  body_html: string;
  category: string | null;
  status: "building" | "ready" | "published" | "archived";
  destination: string | null;
  tags: string[];
  article_count: number;
  created_at: string;
  updated_at: string;
}

export interface DigestStats {
  total_count: number;
  in_newsletter_count: number;
  last_discovery: string | null;
  draft_newsletters: number;
  active_job_id: string | null;
  active_job_status: string | null;
}

export interface DigestJob {
  id: string;
  type: string;
  status: "pending" | "processing" | "done" | "failed";
  error: string | null;
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
    updateRestrictSearch: (restrict: boolean) =>
      request<{ status: string }>("/auth/restrict-search", { method: "PUT", body: JSON.stringify({ restrict }) }),
    updateTheme: (theme: string) =>
      request<{ status: string }>("/auth/theme", { method: "PUT", body: JSON.stringify({ theme }) }),
  },
  content: {
    list: () => request<ContentItem[]>("/content"),
    delete: (id: string) => request<{ status: string }>("/content/" + id, { method: "DELETE" }),
    save: (id: string, data: { title?: string; body_markdown?: string }) => request<{ status: string }>(`/content/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    updateCategories: (id: string, categories: string[]) =>
      request<{ status: string }>(`/content/${id}/categories`, { method: "PUT", body: JSON.stringify({ categories }) }),
    addCategory: (id: string, category: string) =>
      request<{ status: string }>(`/content/${id}/categories`, { method: "POST", body: JSON.stringify({ category }) }),
    removeCategory: (id: string, category: string) =>
      request<{ status: string }>("/content/" + id + "/categories/" + encodeURIComponent(category), { method: "DELETE" }),
    listCategories: () => request<string[]>("/content/categories"),
    addTag: (id: string, tag: string) =>
      request<{ status: string }>(`/content/${id}/tags`, { method: "POST", body: JSON.stringify({ tag }) }),
    removeTag: (id: string, tag: string) =>
      request<{ status: string }>("/content/" + id + "/tags/" + encodeURIComponent(tag), { method: "DELETE" }),
    listTags: () => request<string[]>("/content/tags"),
    updateStatus: (id: string, status: string) =>
      request<{ status: string }>(`/content/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
    updateOutline: (id: string, outline: string) =>
      request<{ status: string }>(`/content/${id}/outline`, { method: "PUT", body: JSON.stringify({ outline }) }),
  },
  digest: {
    run: () => request<{ job_id: string; status: string }>("/digest/run", { method: "POST" }),
    stats: () => request<DigestStats>("/digest/stats"),
    jobs: () => request<DigestJob[]>("/digest/jobs"),
    cancel: () => request<{ status: string }>("/digest/cancel", { method: "POST" }),
    articleNewsletterIDs: () => request<string[]>("/digest/article-newsletter-ids"),
    interests: {
      list: () => request<DigestInterest[]>("/digest/interests"),
      create: (label: string) =>
        request<DigestInterest>("/digest/interests", { method: "POST", body: JSON.stringify({ label }) }),
      updateEnabled: (id: string, enabled: boolean) =>
        request<{ status: string }>("/digest/interests/" + id, { method: "PUT", body: JSON.stringify({ enabled }) }),
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
    generateOutline: (theme: string) =>
      request<{ edition_id: string; item_count: number }>("/compose/generate-outline", { method: "POST", body: JSON.stringify({ theme }) }),
    generateDraft: (theme: string) =>
      request<{ edition_id: string; item_count: number }>("/compose/generate-draft", { method: "POST", body: JSON.stringify({ theme }) }),
    transform: (text: string, action: "expand" | "rewrite") =>
      request<{ edition_id: string; item_count: number }>("/compose/transform", { method: "POST", body: JSON.stringify({ text, action }) }),
    writeArticle: (data: { topic_id: string; voice: string }) =>
      request<{ edition_id: string; item_count: number }>("/compose/write", { method: "POST", body: JSON.stringify(data) }),
  },
  newsletters: {
    list: (params?: { status?: string; category?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.category) qs.set("category", params.category);
      const q = qs.toString();
      return request<NewsletterEdition[]>(`/editions${q ? "?" + q : ""}`);
    },
    get: (id: string) => request<NewsletterEdition>(`/editions/${id}`),
    create: (data?: { title?: string }) =>
      request<NewsletterEdition>("/editions", { method: "POST", body: JSON.stringify(data ?? {}) }),
    updateBody: (id: string, data: { title?: string; body_html?: string }) =>
      request<{ status: string }>(`/editions/${id}/body`, { method: "PUT", body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      request<{ status: string }>(`/editions/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
    updateCategory: (id: string, category: string | null) =>
      request<{ status: string }>(`/editions/${id}/category`, { method: "PUT", body: JSON.stringify({ category }) }),
    addTag: (id: string, tag: string) =>
      request<{ status: string }>(`/editions/${id}/tags/${encodeURIComponent(tag)}`, { method: "POST" }),
    removeTag: (id: string, tag: string) =>
      request<{ status: string }>(`/editions/${id}/tags/${encodeURIComponent(tag)}`, { method: "DELETE" }),
    generateIntro: (id: string) =>
      request<{ status: string }>(`/editions/${id}/generate-intro`, { method: "POST" }),
    articles: (newsletterID: string) =>
      request<ArticleRef[]>(`/editions/${newsletterID}/articles`),
    addArticle: (newsletterID: string, contentID: string) =>
      request<{ status: string }>(`/editions/${newsletterID}/articles`, { method: "POST", body: JSON.stringify({ content_id: contentID }) }),
    removeArticle: (newsletterID: string, contentID: string) =>
      request<{ status: string }>(`/editions/${newsletterID}/articles/${contentID}`, { method: "DELETE" }),
    duplicate: (id: string) =>
      request<NewsletterEdition>(`/editions/${id}/duplicate`, { method: "POST" }),
    updateDestination: (id: string, destination: string | null) =>
      request<{ status: string }>(`/editions/${id}/destination`, { method: "PUT", body: JSON.stringify({ destination }) }),
    listDestinations: () =>
      request<string[]>("/editions/destinations"),
  },
  ideas: {
    list: () => request<Idea[]>("/ideas"),
    get: (id: string) => request<Idea>(`/ideas/${id}`),
    create: (data: { title: string; context?: string; notes?: string; references?: string; priority?: string }) =>
      request<Idea>("/ideas", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { title?: string; context?: string; notes?: string; references?: string; priority?: string; status?: string }) =>
      request<Idea>(`/ideas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    archive: (id: string) =>
      request<{ status: string }>(`/ideas/${id}`, { method: "DELETE" }),
    addTag: (id: string, label: string) =>
      request<{ status: string }>(`/ideas/${id}/tags`, { method: "POST", body: JSON.stringify({ label }) }),
    removeTag: (id: string, tag: string) =>
      request<{ status: string }>(`/ideas/${id}/tags/${encodeURIComponent(tag)}`, { method: "DELETE" }),
    promote: (id: string) =>
      request<{ idea_id: string; title: string; context: string | null; notes: string | null }>(`/ideas/${id}/promote`, { method: "POST" }),
  },
};
