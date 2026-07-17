import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { NewsletterEdition, ArticleRef } from "../../../api/client";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  type: "success" | "warning" | "error";
  count?: number;
  action?: string;
}

export function useEditorChecklist(
  edition: NewsletterEdition | undefined,
  articles: ArticleRef[],
) {
  const { t } = useTranslation();

  return useMemo((): ChecklistItem[] => {
    if (!edition) return [];

    const items: ChecklistItem[] = [];

    // 1. Title defined
    items.push({
      id: "title",
      label: t("editorChecklist.titleDefined"),
      done: edition.title.length > 0 && edition.title !== t("newsletters.newNewsletter"),
      type: edition.title.length > 0 ? "success" : "error",
    });

    // 2. Body written
    const hasBody = edition.body_html.length > 0;
    items.push({
      id: "body",
      label: t("editorChecklist.introWritten"),
      done: hasBody,
      type: hasBody ? "success" : "error",
    });

    // 3. Articles count
    const articleCount = edition.article_count ?? articles.length;
    const enoughArticles = articleCount >= 3;
    items.push({
      id: "articles",
      label: enoughArticles
        ? t("editorChecklist.articlesAdded", { count: articleCount })
        : t("editorChecklist.articlesPending", { count: articleCount, needed: Math.max(0, 3 - articleCount) }),
      done: enoughArticles,
      type: enoughArticles ? "success" : articleCount > 0 ? "warning" : "error",
      count: articleCount,
      action: articleCount < 3 ? "discover" : undefined,
    });

    // 4. Destination configured
    const hasDestination = edition.destination !== null && edition.destination !== "";
    items.push({
      id: "destination",
      label: t("editorChecklist.destinationSet"),
      done: hasDestination,
      type: hasDestination ? "success" : "warning",
    });

    // 5. Category set
    const hasCategory = edition.category !== null && edition.category !== "";
    items.push({
      id: "category",
      label: t("editorChecklist.categorySet"),
      done: hasCategory,
      type: hasCategory ? "success" : "warning",
    });

    return items;
  }, [edition, articles.length, t]);
}
