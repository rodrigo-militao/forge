import { useCallback, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { api, type ContentItem, type NewsletterEdition, type Idea, type DigestSource } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";
import { useHomeQueries } from "./use-home-queries";

export type NextAction = "continue_writing" | "review_draft" | "add_references" | "review" | "publish";

export interface HomeItem {
  id: string;
  title: string;
  type: "article" | "newsletter";
  status: string;
  updatedAt: string;
  editionId?: string;
  body?: string;
  nextAction: NextAction;
}

export interface HomeInsight {
  id: string;
  text: string;
  actionLabel: string;
  to: string;
  icon: "lightbulb" | "fileText" | "mail" | "zap";
}

export function useHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const q = useHomeQueries();

  /* ───── Greeting ───── */

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = q.user?.name ?? "";
    if (hour < 12) return t("home.greetingMorning", { name });
    if (hour < 18) return t("home.greetingAfternoon", { name });
    return t("home.greetingEvening", { name });
  }, [q.user, t]);

  /* ───── Derived data ───── */

  const continueWriting = useMemo((): HomeItem[] => {
    const items: HomeItem[] = [];

    const content = q.content;
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

    const newsletters = q.newsletters;
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
  }, [q.content, q.newsletters]);

  const recentIdeas = useMemo((): Idea[] => {
    return q.ideas
      .filter((i) => i.status === "open")
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [q.ideas]);

  const recentSources = useMemo((): DigestSource[] => (q.sources ?? []).slice(0, 5), [q.sources]);

  const lastPublished = useMemo((): ContentItem | NewsletterEdition | null => {
    const published = q.content.filter((c) => c.status === "published");
    if (published.length > 0) {
      return published.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )[0];
    }
    const pubNl = q.newsletters.filter((n) => n.status === "published");
    if (pubNl.length > 0) {
      return pubNl.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )[0];
    }
    return null;
  }, [q.content, q.newsletters]);

  const isEmpty = !q.isLoading && !q.isError && continueWriting.length === 0 && recentIdeas.length === 0 && !lastPublished;

  /* ───── AI insights ───── */

  const insights = useMemo((): HomeInsight[] => {
    const list: HomeInsight[] = [];

    const apiInsights = q.insights;
    if (apiInsights && apiInsights.length > 0) {
      for (const dto of apiInsights) {
        let text = "";
        let actionLabel = "";
        const ideas = q.ideas ?? [];
        const content = q.content ?? [];
        const newsletters = q.newsletters ?? [];

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

    // Fallback
    const openIdeas = q.ideas.filter((i) => i.status === "open");
    if (openIdeas.length > 0) {
      list.push({
        id: "ideas-worth-developing",
        text: t("home.insightIdeas", { count: openIdeas.length }),
        actionLabel: t("home.reviewIdeas"),
        to: "/content/ideas",
        icon: "lightbulb",
      });
    }

    const isDraftStatus = (s: string) => s === "building" || s === "draft";
    const draftsNeedingReferences = q.content.filter(
      (c) => isDraftStatus(c.status) && c.body_markdown && c.body_markdown.trim().length > 50,
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

    const publishedNl = q.newsletters
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
  }, [q.ideas, q.content, q.newsletters, q.insights, t]);

  const editorialAttention = useMemo((): HomeInsight[] => {
    return (insights ?? []).filter((i) => {
      return i.id === "drafts-need-references" || i.id === "newsletter-overdue" || i.id === "ideas-worth-developing";
    });
  }, [insights]);

  /* ───── Actions ───── */

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

  return {
    greeting,
    user: q.user,
    continueWriting,
    recentIdeas,
    lastPublished,
    recentSources,
    insights,
    editorialAttention,
    isLoading: q.isLoading,
    isError: q.isError,
    isEmpty,
    handleContinueWriting,
    handleCreateArticle,
    handleCreateNewsletter,
    handleCreateIdea,
    handleCaptureIdea,
    handleRetry: q.refetchAll,
  };
}
