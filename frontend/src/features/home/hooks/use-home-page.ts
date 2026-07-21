import { useCallback, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { api, type ContentItem, type NewsletterEdition, type Idea, type DigestSource } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";
import { useAuth } from "../../../features/auth/store";

export type NextAction = "continue_writing" | "review_draft" | "add_references" | "review" | "publish";

export interface HomeItem {
  id: string;
  title: string;
  type: "article" | "newsletter";
  status: string;
  updatedAt: string;
  /** Only for newsletters: the edition id to navigate to */
  editionId?: string;
  /** Body markdown for article items (used to derive nextAction) */
  body?: string;
  /** Suggested next action for this item */
  nextAction: NextAction;
}

export interface HomeInsight {
  id: string;
  text: string;
  actionLabel: string;
  /** Route to navigate to, or null if action is not a link */
  to: string;
  /** Icon type for the insight */
  icon: "lightbulb" | "fileText" | "mail" | "zap";
}

export function useHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);

  /* ───── Data fetching ───── */

  const contentQuery = useQuery({
    queryKey: queryKeys.content.all,
    queryFn: api.content.list,
  });

  const ideasQuery = useQuery({
    queryKey: queryKeys.ideas.all,
    queryFn: api.ideas.list,
  });

  const newslettersQuery = useQuery({
    queryKey: queryKeys.editions.all,
    queryFn: api.newsletters.list,
  });

  const sourcesQuery = useQuery({
    queryKey: queryKeys.digestSources.all,
    queryFn: api.digest.sources.list,
  });

  const insightsQuery = useQuery({
    queryKey: queryKeys.home.insights,
    queryFn: api.home.insights,
    staleTime: 5 * 60 * 1000, // 5 min — insights don't change every second
  });

  /* ───── Derived data ───── */

  const isLoading = contentQuery.isLoading || ideasQuery.isLoading || newslettersQuery.isLoading;
  const isError = contentQuery.isError || ideasQuery.isError || newslettersQuery.isError;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = user?.name ?? "";
    if (hour < 12) return t("home.greetingMorning", { name });
    if (hour < 18) return t("home.greetingAfternoon", { name });
    return t("home.greetingEvening", { name });
  }, [user, t]);

  /** Ongoing work: draft articles + building/ready newsletters, sorted by updated_at */
  const continueWriting = useMemo((): HomeItem[] => {
    const items: HomeItem[] = [];

    const content = contentQuery.data ?? [];
    for (const c of content) {
      if (c.status !== "building" && c.status !== "draft") continue;
      if (c.product !== "compose" && c.product !== "newsletter") continue;
      const hasBody = c.body_markdown && c.body_markdown.trim().length > 50;
      items.push({
        id: c.id,
        title: c.title || "(no title)",
        type: "article",
        status: c.status,
        updatedAt: c.updated_at,
        body: c.body_markdown ?? "",
        nextAction: hasBody ? "review_draft" : "continue_writing",
      });
    }

    const newsletters = newslettersQuery.data ?? [];
    for (const n of newsletters) {
      if (n.status !== "building" && n.status !== "ready") continue;
      items.push({
        id: n.id,
        title: n.title || "(no title)",
        type: "newsletter",
        status: n.status,
        updatedAt: n.updated_at,
        editionId: n.id,
        nextAction: n.status === "ready" ? "review" : "continue_writing",
      });
    }

    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return items.slice(0, 6);
  }, [contentQuery.data, newslettersQuery.data]);

  /** Open ideas, sorted by updated_at */
  const recentIdeas = useMemo((): Idea[] => {
    const ideas = ideasQuery.data ?? [];
    return ideas
      .filter((i) => i.status === "open")
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [ideasQuery.data]);

  /** Recent sources, sorted by latest */
  const recentSources = useMemo((): DigestSource[] => {
    return (sourcesQuery.data ?? []).slice(0, 5);
  }, [sourcesQuery.data]);

  /** Last published item */
  const lastPublished = useMemo((): ContentItem | NewsletterEdition | null => {
    const content = contentQuery.data ?? [];
    const published = content.filter((c) => c.status === "published");
    if (published.length > 0) {
      return published.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )[0];
    }
    const newsletters = newslettersQuery.data ?? [];
    const pubNl = newsletters.filter((n) => n.status === "published");
    if (pubNl.length > 0) {
      return pubNl.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )[0];
    }
    return null;
  }, [contentQuery.data, newslettersQuery.data]);

  const isEmpty = !isLoading && !isError && continueWriting.length === 0 && recentIdeas.length === 0 && !lastPublished;

  /** AI insights — tries API first, falls back to client-side derivation */
  const insights = useMemo((): HomeInsight[] => {
    const list: HomeInsight[] = [];

    // API response takes precedence
    const apiInsights = insightsQuery.data;
    if (apiInsights && apiInsights.length > 0) {
      for (const dto of apiInsights) {
        let text = "";
        let actionLabel = "";
        const ideas = ideasQuery.data ?? [];
        const content = contentQuery.data ?? [];
        const newsletters = newslettersQuery.data ?? [];

        switch (dto.id) {
          case "ideas-worth-developing": {
            const count = ideas.filter((i) => i.status === "open").length;
            text = t("home.insightIdeas", { count });
            actionLabel = t("home.reviewIdeas");
            break;
          }
          case "drafts-need-references": {
            const isDraft = (s: string) => s === "building" || s === "draft";
            const count = content.filter(
              (c) => isDraft(c.status) && c.body_markdown && c.body_markdown.trim().length > 50,
            ).length;
            text = t("home.insightDrafts", { count });
            actionLabel = t("home.reviewDrafts");
            break;
          }
          case "newsletter-overdue": {
            const published = newsletters
              .filter((n) => n.status === "published")
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            if (published.length > 0) {
              const days = Math.floor(
                (Date.now() - new Date(published[0].updated_at).getTime()) / (1000 * 60 * 60 * 24),
              );
              text = t("home.insightNewsletter", { days });
              actionLabel = t("home.openNewsletter");
            }
            break;
          }
        }

        if (text) {
          list.push({
            id: dto.id,
            text,
            actionLabel,
            to: dto.to,
            icon: dto.icon,
          });
        }
      }
      return list;
    }

    // Fallback: client-side derivation (used when API is unreachable)
    const ideas = ideasQuery.data ?? [];
    const content = contentQuery.data ?? [];
    const newsletters = newslettersQuery.data ?? [];

    const openIdeas = ideas.filter((i) => i.status === "open");
    if (openIdeas.length > 0) {
      list.push({
        id: "ideas-worth-developing",
        text: t("home.insightIdeas", { count: openIdeas.length }),
        actionLabel: t("home.reviewIdeas"),
        to: "/content/ideas",
        icon: "lightbulb",
      });
    }

    const isDraft = (s: string) => s === "building" || s === "draft";
    const draftsNeedingReferences = content.filter(
      (c) => isDraft(c.status) && c.body_markdown && c.body_markdown.trim().length > 50,
    );
    if (draftsNeedingReferences.length > 0) {
      list.push({
        id: "drafts-need-references",
        text: t("home.insightDrafts", { count: draftsNeedingReferences.length }),
        actionLabel: t("home.reviewDrafts"),
        to: "/content/articles",
        icon: "fileText",
      });
    }

    const publishedNl = newsletters
      .filter((n) => n.status === "published")
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    if (publishedNl.length > 0) {
      const lastPub = new Date(publishedNl[0].updated_at);
      const daysSince = Math.floor((Date.now() - lastPub.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) {
        list.push({
          id: "newsletter-overdue",
          text: t("home.insightNewsletter", { days: daysSince }),
          actionLabel: t("home.openNewsletter"),
          to: `/content/newsletters/${publishedNl[0].id}/edit`,
          icon: "mail",
        });
      }
    }

    return list;
  }, [ideasQuery.data, contentQuery.data, newslettersQuery.data, insightsQuery.data, t]);

  /** Editorial attention: high-relevance insights that are actionable */
  const editorialAttention = useMemo((): HomeInsight[] => {
    return (insights ?? []).filter((i) => {
      // Only show genuinely actionable, high-relevance insights
      return i.id === "drafts-need-references" || i.id === "newsletter-overdue" || i.id === "ideas-worth-developing";
    });
  }, [insights]);

  const handleContinueWriting = useCallback(
    (item: HomeItem) => {
      if (item.type === "article") {
        navigate({ to: `/content/articles/${item.id}/edit` });
      } else if (item.type === "newsletter" && item.editionId) {
        navigate({ to: `/content/newsletters/${item.editionId}/edit` });
      }
    },
    [navigate],
  );

  const handleCreateNewsletter = useCallback(async () => {
    try {
      const edition = await api.newsletters.create();
      navigate({ to: `/content/newsletters/${edition.id}/edit` });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create newsletter");
    }
  }, [navigate]);

  const handleCreateArticle = useCallback(() => {
    navigate({ to: "/content/articles" });
  }, [navigate]);

  const handleCreateIdea = useCallback(() => {
    navigate({ to: "/content/ideas" });
  }, [navigate]);

  const handleCaptureIdea = useCallback(
    async (title: string) => {
      if (!title.trim()) return;
      try {
        await api.ideas.create({ title: title.trim() });
        await queryClient.invalidateQueries({ queryKey: queryKeys.ideas.all });
        toast.success(t("home.ideaSaved"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    },
    [queryClient, t],
  );

  const handleRetry = useCallback(() => {
    contentQuery.refetch();
    ideasQuery.refetch();
    newslettersQuery.refetch();
  }, [contentQuery, ideasQuery, newslettersQuery]);

  return {
    greeting,
    user,
    continueWriting,
    recentIdeas,
    lastPublished,
    recentSources,
    insights,
    editorialAttention,
    isLoading,
    isError,
    isEmpty,
    handleContinueWriting,
    handleCreateArticle,
    handleCreateNewsletter,
    handleCreateIdea,
    handleCaptureIdea,
    handleRetry,
  };
}
