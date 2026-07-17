import { request } from "./request";
import type { DigestStats, DigestJob, DigestInterest, DigestSource } from "./types";

export const digest = {
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
};
