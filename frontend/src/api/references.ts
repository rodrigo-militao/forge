import { request } from "./request";
import type { Reference } from "./types";

export const references = {
  list: () => request<Reference[]>("/references"),
  get: (id: string) => request<Reference>(`/references/${id}`),
  create: (data: {
    url: string;
    title?: string | null;
    description?: string | null;
    source_name?: string | null;
    reference_type: string;
  }) => request<Reference>("/references", { method: "POST", body: JSON.stringify(data) }),
  update: (
    id: string,
    data: {
      url?: string;
      title?: string | null;
      description?: string | null;
      source_name?: string | null;
      reference_type?: string;
    },
  ) => request<Reference>(`/references/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => request<{ status: string }>(`/references/${id}`, { method: "DELETE" }),

  // Idea relationships
  listForIdea: (ideaId: string) => request<Reference[]>(`/ideas/${ideaId}/references`),
  attachToIdea: (ideaId: string, referenceId: string) =>
    request<{ status: string }>(`/ideas/${ideaId}/references/${referenceId}`, { method: "POST" }),
  detachFromIdea: (ideaId: string, referenceId: string) =>
    request<{ status: string }>(`/ideas/${ideaId}/references/${referenceId}`, { method: "DELETE" }),

  // Content relationships
  listForContent: (contentId: string) => request<Reference[]>(`/content/${contentId}/references`),
  attachToContent: (contentId: string, referenceId: string) =>
    request<{ status: string }>(`/content/${contentId}/references/${referenceId}`, { method: "POST" }),
  detachFromContent: (contentId: string, referenceId: string) =>
    request<{ status: string }>(`/content/${contentId}/references/${referenceId}`, { method: "DELETE" }),
};
