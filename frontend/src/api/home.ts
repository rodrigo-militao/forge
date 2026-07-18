import { request } from "./request";

export interface HomeInsightDTO {
  id: string;
  text: string;
  action_label: string;
  to: string;
  icon: "lightbulb" | "fileText" | "mail" | "sparkles";
}

export const home = {
  insights: () => request<HomeInsightDTO[]>("/home/insights"),
};
