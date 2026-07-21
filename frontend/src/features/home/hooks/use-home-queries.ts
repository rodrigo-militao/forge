import { useQuery } from "@tanstack/react-query";
import { api } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";
import { useAuth } from "../../../features/auth/store";

export function useHomeQueries() {
  const user = useAuth((s) => s.user);

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
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = contentQuery.isLoading || ideasQuery.isLoading || newslettersQuery.isLoading;
  const isError = contentQuery.isError || ideasQuery.isError || newslettersQuery.isError;

  return {
    contentQuery,
    ideasQuery,
    newslettersQuery,
    sourcesQuery,
    insightsQuery,
    isLoading,
    isError,
    user,
    content: contentQuery.data ?? [],
    ideas: ideasQuery.data ?? [],
    newsletters: newslettersQuery.data ?? [],
    sources: sourcesQuery.data ?? [],
    insights: insightsQuery.data ?? [],
    refetchAll: () => {
      contentQuery.refetch();
      ideasQuery.refetch();
      newslettersQuery.refetch();
    },
  };
}
