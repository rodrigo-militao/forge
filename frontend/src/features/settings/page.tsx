import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../../api/client";
import { useAuth } from "../auth/store";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const [newInterest, setNewInterest] = useState("");

  const { data: interests } = useQuery({
    queryKey: ["digest-interests"],
    queryFn: api.digest.interests.list,
  });

  const [editingSource, setEditingSource] = useState<import("../../api/client").DigestSource | null>(null);
  const [newSourceType, setNewSourceType] = useState<"rss" | "web_search" | null>(null);

  const { data: sources } = useQuery({
    queryKey: ["digest-sources"],
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
        queryClient.invalidateQueries({ queryKey: ["digest-sources"] });
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
        queryClient.invalidateQueries({ queryKey: ["digest-sources"] });
        toast.success(t("settings.sourceDeleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    },
    [queryClient, t],
  );

  const handleAddInterest = useCallback(async () => {
    const label = newInterest.trim();
    if (!label) return;
    try {
      await api.digest.interests.create(label);
      setNewInterest("");
      queryClient.invalidateQueries({ queryKey: ["digest-interests"] });
      toast.success(t("settings.addInterest"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }, [newInterest, queryClient, t]);

  const handleToggleInterest = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await api.digest.interests.updateEnabled(id, enabled);
        queryClient.invalidateQueries({ queryKey: ["digest-interests"] });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed";
        if (msg.includes("max_active_interests")) {
          toast.error(t("settings.maxInterestsReached"));
        } else {
          toast.error(msg);
        }
      }
    },
    [queryClient, t],
  );

  const handleDeleteInterest = useCallback(
    async (id: string) => {
      try {
        await api.digest.interests.delete(id);
        queryClient.invalidateQueries({ queryKey: ["digest-interests"] });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    },
    [queryClient],
  );

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

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
            <button
              onClick={async () => {
                await api.auth.updateRestrictSearch(!user.restrict_search_to_sources);
                const updated = await api.auth.me();
                useAuth.setState({ user: updated });
              }}
              className={`h-5 w-9 cursor-pointer rounded-full transition-colors duration-150 ${
                user.restrict_search_to_sources ? "bg-[var(--color-accent-primary)]" : "bg-white/15"
              }`}
            >
              <span
                className={`block h-4 w-4 translate-y-0.5 rounded-full bg-white transition-transform ${
                  user.restrict_search_to_sources ? "translate-x-[14px]" : "translate-x-0.5"
                }`}
              />
            </button>
            {t("settings.restrictSearch")}
          </label>
        </div>
      )}

      {/* Preferences: language + theme */}
      <section className="mt-12">
        <h2 className="text-xs font-medium text-[var(--color-text-muted)]">
          {t("settings.preferences")}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-secondary)]">{t("settings.language")}</p>
            <div className="flex gap-2">
              {["en", "pt", "es"].map((lng) => (
                <button
                  key={lng}
                  onClick={() => changeLanguage(lng)}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    i18n.language === lng
                      ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]"
                      : "border-[var(--color-border)]/20 text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50"
                  }`}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-secondary)]">{t("settings.theme")}</p>
            <div className="flex gap-2">
              {["dark", "light"].map((theme) => (
                <button
                  key={theme}
                  onClick={async () => {
                    await api.auth.updateTheme(theme);
                    if (typeof document !== "undefined") {
                      document.documentElement.dataset.theme = theme;
                    }
                    const updated = await api.auth.me();
                    useAuth.setState({ user: updated });
                    toast.success(t("settings.themeUpdated"));
                  }}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    user?.theme_preference === theme
                      ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]"
                      : "border-[var(--color-border)]/20 text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50"
                  }`}
                >
                  {t(`settings.theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Interests */}
      <section className="mt-12">
        <h2 className="text-xs font-medium text-[var(--color-text-muted)]">
          {t("settings.interests")}
        </h2>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">{t("settings.interestsHint")}</p>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddInterest()}
            placeholder={t("settings.interestPlaceholder")}
            className="flex-1 rounded-lg border border-[var(--color-border)]/20 bg-[var(--color-bg-surface)]/5 px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-accent-primary)]"
          />
          <button
            onClick={handleAddInterest}
            disabled={!newInterest.trim()}
            className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("settings.addInterest")}
          </button>
        </div>

        <ul className="mt-4 space-y-1.5">
          {interests?.map((interest) => (
            <li
              key={interest.id}
              className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleInterest(interest.id, !interest.enabled)}
                  className={`h-5 w-9 cursor-pointer rounded-full transition-colors duration-150 ${
                    interest.enabled ? "bg-[var(--color-accent-primary)]" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`block h-4 w-4 translate-y-0.5 rounded-full bg-white transition-transform duration-150 ${
                      interest.enabled ? "translate-x-[14px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className={`text-sm ${interest.enabled ? "text-[var(--color-bg-surface)]" : "text-[var(--color-text-muted)]"}`}>
                  {interest.label}
                </span>
              </div>
              <button
                onClick={() => handleDeleteInterest(interest.id)}
                className="cursor-pointer text-xs text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-accent-danger)] hover:underline"
              >
                {t("settings.deleteInterest")}
              </button>
            </li>
          ))}
          {interests?.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">
              No interests yet. Add some to focus your Discover curation.
            </p>
          )}
        </ul>
      </section>

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

function EditSourceForm({
  source,
  onSave,
  onCancel,
}: {
  source: import("../../api/client").DigestSource;
  onSave: (data: { id?: string; name: string; type: string; config: Record<string, string>; enabled?: boolean }) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(source.name);
  const [config, setConfig] = useState<Record<string, string>>(source.config);
  const [enabled, setEnabled] = useState(source.enabled);

  return (
    <div className="space-y-3 rounded-lg border border-[var(--color-border)]/20 bg-[var(--color-hover-subtle)] p-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("settings.sourceName")}
        className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]"
      />
      {source.type === "rss" ? (
        <input
          type="text"
          value={config.url ?? ""}
          onChange={(e) => setConfig({ url: e.target.value })}
          placeholder={t("settings.sourceURLPlaceholder")}
          className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]"
        />
      ) : (
        <input
          type="text"
          value={config.query ?? ""}
          onChange={(e) => setConfig({ query: e.target.value })}
          placeholder={t("settings.sourceQueryPlaceholder")}
          className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]"
        />
      )}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <button
          onClick={() => setEnabled(!enabled)}
          className={`h-5 w-9 cursor-pointer rounded-full transition-colors duration-150 ${
            enabled ? "bg-[var(--color-accent-primary)]" : "bg-white/15"
          }`}
        >
          <span
            className={`block h-4 w-4 translate-y-0.5 rounded-full bg-white transition-transform duration-150 ${
              enabled ? "translate-x-[14px]" : "translate-x-0.5"
            }`}
          />
        </button>
        {t("settings.sourceEnabled")}
      </label>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave({ id: source.id, name, type: source.type, config, enabled })}
          className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {t("settings.save")}
        </button>
        <button onClick={onCancel} className="cursor-pointer rounded-lg border border-[var(--color-border)]/20 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/5">
          {t("settings.cancel")}
        </button>
      </div>
    </div>
  );
}

function AddSourceForm({
  type,
  onSave,
  onCancel,
}: {
  type: "rss" | "web_search";
  onSave: (data: { name: string; type: string; config: Record<string, string> }) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [config, setConfig] = useState<Record<string, string>>({});

  return (
    <div className="space-y-3 rounded-lg border border-[var(--color-border)]/20 bg-[var(--color-hover-subtle)] p-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("settings.sourceName")}
        className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]"
      />
      {type === "rss" ? (
        <input
          type="text"
          value={config.url ?? ""}
          onChange={(e) => setConfig({ url: e.target.value })}
          placeholder={t("settings.sourceURLPlaceholder")}
          className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]"
        />
      ) : (
        <input
          type="text"
          value={config.query ?? ""}
          onChange={(e) => setConfig({ query: e.target.value })}
          placeholder={t("settings.sourceQueryPlaceholder")}
          className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]"
        />
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave({ name, type, config })}
          disabled={!name.trim()}
          className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("settings.addSource")}
        </button>
        <button onClick={onCancel} className="cursor-pointer rounded-lg border border-[var(--color-border)]/20 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/5">
          {t("settings.cancel")}
        </button>
      </div>
    </div>
  );
}
