import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../../api/client";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../auth/store";
import { Toggle } from "../../components/ui/toggle";
import { EditSourceForm } from "./components/edit-source-form";
import { AddSourceForm } from "./components/add-source-form";
import { InterestsSection } from "./components/interests-section";
import { PreferencesSection } from "./components/preferences-section";

export function SettingsPage() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();

  const { data: interests } = useQuery({
    queryKey: queryKeys.digestInterests.all,
    queryFn: api.digest.interests.list,
  });

  const [editingSource, setEditingSource] = useState<import("../../api/client").DigestSource | null>(null);
  const [newSourceType, setNewSourceType] = useState<"rss" | "web_search" | null>(null);

  const { data: sources } = useQuery({
    queryKey: queryKeys.digestSources.all,
    queryFn: api.digest.sources.list,
  });

  const activeSources = sources?.filter((s) => s.enabled).length ?? 0;
  const activeInterests = interests?.filter((i) => i.enabled).length ?? 0;

  const handleSaveSource = useCallback(
    async (data: { id?: string; name: string; type: string; config: Record<string, string>; enabled?: boolean }) => {
      try {
        if (data.id) {
          await api.digest.sources.update(data.id, { name: data.name, type: data.type, config: data.config, enabled: data.enabled ?? true });
        } else {
          await api.digest.sources.create({ name: data.name, type: data.type, config: data.config });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.digestSources.all });
        setEditingSource(null);
        setNewSourceType(null);
        toast.success(t("settings.sourceSaved"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed";
        if (msg.includes("max_active_sources")) {
          toast.error(t("settings.maxSourcesReached"));
        } else {
          toast.error(msg);
        }
      }
    },
    [queryClient, t],
  );

  const handleDeleteSource = useCallback(
    async (id: string) => {
      try {
        await api.digest.sources.delete(id);
        queryClient.invalidateQueries({ queryKey: queryKeys.digestSources.all });
        toast.success(t("settings.sourceDeleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    },
    [queryClient, t],
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-[var(--font-display)] text-2xl">{t("settings.title")}</h1>

      {/* Plan limits */}
      {user && (
        <div className="mt-8 rounded-lg border border-[var(--color-border)]/20 bg-[var(--color-hover-subtle)] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--color-bg-surface)]">{t("settings.planLimits")}</h3>
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
              {user.plano_ativo ? "Active" : "Free"}
            </span>
          </div>
          <div className="mt-2 flex gap-6 text-xs text-[var(--color-text-muted)]">
            <span>
              {t("settings.activeSources")}: {activeSources}/{user.max_active_sources}
            </span>
            <span>
              {t("settings.activeInterests")}: {activeInterests}/{user.max_active_interests}
            </span>
            <span>
              {t("settings.monthlyUsage")}: {user.usage_this_month}/{user.max_monthly_generations}
            </span>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-[var(--color-text-muted)]">
            <Toggle
              checked={user.restrict_search_to_sources}
              onChange={async () => {
                await api.auth.updateRestrictSearch(!user.restrict_search_to_sources);
                const updated = await api.auth.me();
                useAuth.setState({ user: updated });
              }}
            />
            {t("settings.restrictSearch")}
          </label>
        </div>
      )}

      {/* Preferences: language + theme */}
      <PreferencesSection />

      {/* Interests */}
      <InterestsSection />

      {/* Sources */}
      <section className="mt-12">
        <h2 className="text-xs font-medium text-[var(--color-text-muted)]">
          {t("settings.sources")}
        </h2>

        <p className="mt-3 text-xs text-[var(--color-text-muted)]">{t("settings.sourcesHint")}</p>

        {editingSource ? (
          <div className="mt-4">
            <EditSourceForm
              source={editingSource}
              onSave={handleSaveSource}
              onCancel={() => setEditingSource(null)}
            />
          </div>
        ) : (
          <>
            {newSourceType && (
              <div className="mt-4">
                <AddSourceForm
                  type={newSourceType}
                  onSave={handleSaveSource}
                  onCancel={() => setNewSourceType(null)}
                />
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setNewSourceType(newSourceType === "rss" ? null : "rss")}
                className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                {t("settings.addSource")} RSS
              </button>
              <button
                onClick={() => setNewSourceType(newSourceType === "web_search" ? null : "web_search")}
                className="cursor-pointer rounded-lg border border-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-accent-primary)] hover:text-white"
              >
                {t("settings.addSource")} Web Search
              </button>
            </div>

            <ul className="mt-4 space-y-1.5">
              {sources?.map((source) => (
                <li
                  key={source.id}
                  className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${source.enabled ? "bg-[var(--color-accent-success)]" : "bg-white/15"}`} />
                    <div>
                      <span className="text-sm font-medium text-[var(--color-bg-surface)]">{source.name}</span>
                      <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                        {source.type === "rss" ? t("settings.sourceRSS") : t("settings.sourceWebSearch")}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setEditingSource(source)}
                      className="cursor-pointer text-xs text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-bg-surface)] hover:underline"
                    >
                      {t("settings.editSource")}
                    </button>
                    <button
                      onClick={() => handleDeleteSource(source.id)}
                      className="cursor-pointer text-xs text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-accent-danger)] hover:underline"
                    >
                      {t("settings.deleteSource")}
                    </button>
                  </div>
                </li>
              ))}
              {(!sources || sources.length === 0) && !newSourceType && (
                <p className="text-xs text-[var(--color-text-muted)]">{t("settings.noSources")}</p>
              )}
            </ul>
          </>
        )}
      </section>

      {/* Profile */}
      {user && (
        <section className="mt-12 border-t border-[var(--color-border)]/10 pt-8">
          <h2 className="text-xs font-medium text-[var(--color-text-muted)]">Profile</h2>
          <div className="mt-4 space-y-1">
            <p className="text-sm text-[var(--color-bg-surface)]">{user.name}</p>
            <p className="text-sm text-[var(--color-text-muted)]">{user.email}</p>
          </div>
        </section>
      )}
    </div>
  );
}
