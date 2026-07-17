import { request } from "./request";
import type { NewsletterEdition, ArticleRef } from "./types";

export const newsletters = {
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
};
