import { request } from "./request";
import type { ContentItem } from "./types";

export const content = {
  list: () => request<ContentItem[]>("/content"),
  delete: (id: string) => request<{ status: string }>("/content/" + id, { method: "DELETE" }),
  save: (id: string, data: { title?: string; body_markdown?: string }) =>
    request<{ status: string }>(`/content/${id}`, { method: "PUT", body: JSON.stringify(data) }),
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
};
