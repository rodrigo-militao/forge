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
  type: "article" | "newsletter";
  product: "digest" | "compose" | "newsletter";
  status: "building" | "review" | "ready" | "published" | "discarded";
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
  status: "building" | "review" | "ready" | "published" | "archived";
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

export type ReferenceType = "article" | "video" | "podcast" | "social_post" | "document" | "website" | "other";

export interface Reference {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  description: string | null;
  source_name: string | null;
  reference_type: ReferenceType;
  created_at: string;
  updated_at: string;
}

export interface AIAnalysisResult {
  id: string;
  user_id: string;
  content_id: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  score: number;
  created_at: string;
  updated_at: string;
}

export interface AITextSuggestion {
  original: string;
  suggestion: string;
}
