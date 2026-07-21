import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, type NewsletterEdition } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";
import { useOutsideClick } from "../../../hooks/useOutsideClick";

export function useDigestNewsletter() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const selectorRef = useRef<HTMLDivElement>(null);
  const [newsletterAnchor, setNewsletterAnchor] = useState<{
    articleId: string;
    top: number;
    right: number;
  } | null>(null);
  const [draftNewsletters, setDraftNewsletters] = useState<NewsletterEdition[]>([]);
  const [creatingNewsletter, setCreatingNewsletter] = useState(false);

  const newsletterOpen = newsletterAnchor?.articleId ?? null;
  useOutsideClick(selectorRef, () => setNewsletterAnchor(null), !!newsletterOpen);

  const openNewsletterSelector = useCallback(async (target: string, e?: React.MouseEvent) => {
    const btnRect = (e?.currentTarget as HTMLElement)?.getBoundingClientRect();
    try {
      const editions = await api.newsletters.list({ status: "building" });
      setDraftNewsletters(editions);
    } catch {
      setDraftNewsletters([]);
    }
    setNewsletterAnchor(btnRect
      ? {
          articleId: target,
          top: btnRect.bottom + 6,
          right: window.innerWidth - btnRect.right,
        }
      : null);
  }, []);

  const addToNewsletter = useCallback(
    async (newsletterID: string, articleID: string) => {
      try {
        await api.newsletters.addArticle(newsletterID, articleID);
        queryClient.invalidateQueries({ queryKey: queryKeys.articleNewsletterIds.all });
        toast.success(t("editor.saved"));
        setNewsletterAnchor(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("digest.failed"));
      }
    },
    [queryClient, t],
  );

  const createAndAddToNewsletter = useCallback(
    async (articleID: string) => {
      setCreatingNewsletter(true);
      try {
        const edition = await api.newsletters.create({ title: "New newsletter" });
        await api.newsletters.addArticle(edition.id, articleID);
        queryClient.invalidateQueries({ queryKey: queryKeys.articleNewsletterIds.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
        toast.success(t("digest.newsletterCreated"));
        setNewsletterAnchor(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("digest.failed"));
      }
      setCreatingNewsletter(false);
    },
    [queryClient, t],
  );

  return {
    newsletterAnchor,
    selectorRef,
    draftNewsletters,
    creatingNewsletter,
    openNewsletterSelector,
    addToNewsletter,
    createAndAddToNewsletter,
  };
}
