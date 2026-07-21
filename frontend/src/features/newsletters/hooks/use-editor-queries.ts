import { useQuery } from "@tanstack/react-query";
import { api, type NewsletterEdition, type ArticleRef } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";

export function useEditorQueries(editionId: string) {
  const editionQuery = useQuery({
    queryKey: queryKeys.editions.detail(editionId),
    queryFn: () => api.newsletters.get(editionId),
  });

  const editionArticlesQuery = useQuery({
    queryKey: queryKeys.editions.articles(editionId),
    queryFn: () => api.newsletters.articles(editionId),
  });

  const allContentQuery = useQuery({
    queryKey: queryKeys.content.all,
    queryFn: api.content.list,
  });

  const articleNewsletterIDsQuery = useQuery({
    queryKey: queryKeys.articleNewsletterIds.all,
    queryFn: api.digest.articleNewsletterIDs,
  });

  const availableTagsQuery = useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: api.content.listTags,
  });

  const edition = editionQuery.data;
  const editionArticles = editionArticlesQuery.data ?? [];

  // Derive articles that can be added to this edition
  const articleIDsInEdition = new Set(editionArticles.map((a) => a.content_id));
  const usedIDs = new Set([...articleIDsInEdition, ...(articleNewsletterIDsQuery.data ?? [])]);
  const availableArticles = (allContentQuery.data ?? []).filter(
    (c) => c.deleted_at === null && !usedIDs.has(c.id),
  );

  return {
    edition,
    editionArticles,
    allContent: allContentQuery.data ?? [],
    availableArticles,
    availableTags: availableTagsQuery.data ?? [],
    isLoading: editionQuery.isLoading,
    refetchEdition: () => editionQuery.refetch(),
  };
}
