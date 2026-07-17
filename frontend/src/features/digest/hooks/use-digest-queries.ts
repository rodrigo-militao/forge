import { useQuery } from "@tanstack/react-query";
import { api, type ContentItem, type NewsletterEdition, type DigestSource, type DigestInterest, type DigestStats, type DigestJob } from "../../../api/client";
import { useAuth } from "../../auth/store";
import { queryKeys } from "../../../lib/queryKeys";

export function useDigestQueries(showJobs: boolean) {
  const { data: content, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: queryKeys.content.all,
    queryFn: api.content.list,
  });

  const { data: usedIDs } = useQuery({
    queryKey: queryKeys.articleNewsletterIds.all,
    queryFn: api.digest.articleNewsletterIDs,
  });

  const { data: stats } = useQuery({
    queryKey: queryKeys.digest.stats,
    queryFn: api.digest.stats,
  });

  const { data: jobs } = useQuery({
    queryKey: queryKeys.digest.jobs,
    queryFn: api.digest.jobs,
    enabled: showJobs,
  });

  const user = useAuth((s) => s.user);
  const { data: sources } = useQuery({
    queryKey: queryKeys.digestSources.all,
    queryFn: api.digest.sources.list,
    staleTime: 30000,
  });
  const { data: interestsData } = useQuery({
    queryKey: queryKeys.digestInterests.all,
    queryFn: api.digest.interests.list,
    staleTime: 30000,
  });

  const hasActiveSources = (sources ?? []).some((s: DigestSource) => s.enabled);
  const hasActiveInterests = (interestsData ?? []).some((i: DigestInterest) => i.enabled);

  const usedSet = new Set(usedIDs ?? []);

  // All non-deleted digest items
  const digestItems = (content ?? []).filter(
    (c) => c.product === "digest" && c.deleted_at === null,
  );

  // Contextual tip for empty state
  let contextualTipKey: string | null = null;
  if (digestItems.length === 0) {
    if (user?.restrict_search_to_sources && !hasActiveSources) {
      contextualTipKey = "digest.restrictNoSources";
    } else if (!hasActiveSources && !hasActiveInterests) {
      contextualTipKey = "digest.noSourcesNoInterests";
    } else {
      contextualTipKey = "digest.emptyWithSources";
    }
  }

  return {
    content,
    isLoading,
    isError,
    dataUpdatedAt,
    usedIDs,
    usedSet,
    stats,
    jobs,
    sources,
    interestsData,
    hasActiveSources,
    hasActiveInterests,
    digestItems,
    contextualTipKey,
    user,
  };
}
