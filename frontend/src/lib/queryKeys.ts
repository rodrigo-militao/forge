// queryKeys is the single source of truth for TanStack Query cache keys.
// Use these constants instead of raw string literals to prevent key collisions
// and enable type-safe cache invalidation.
export const queryKeys = {
  ideas: { all: ["ideas"] as const },
  content: { all: ["content"] as const },
  tags: { all: ["tags"] as const },
  digestInterests: { all: ["digest-interests"] as const },
  digestSources: { all: ["digest-sources"] as const },
  editions: {
    all: ["editions"] as const,
    detail: (id: string) => ["edition", id] as const,
    articles: (id: string) => ["edition-articles", id] as const,
    destinations: ["editions", "destinations"] as const,
  },
  articleNewsletterIds: { all: ["article-newsletter-ids"] as const },
  digest: {
    stats: ["digest", "stats"] as const,
    jobs: ["digest", "jobs"] as const,
  },
} as const;
