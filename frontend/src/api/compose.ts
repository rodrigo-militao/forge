import { request } from "./request";

export const compose = {
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
};
