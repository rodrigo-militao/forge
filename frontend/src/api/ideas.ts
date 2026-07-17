import { request } from "./request";
import type { Idea } from "./types";

export const ideas = {
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
};
