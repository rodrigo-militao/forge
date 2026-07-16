import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";
import { Toggle } from "../../../components/ui/toggle";

export function InterestsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [newInterest, setNewInterest] = useState("");

  const { data: interests } = useQuery({
    queryKey: queryKeys.digestInterests.all,
    queryFn: api.digest.interests.list,
  });

  const handleAddInterest = async () => {
    const label = newInterest.trim();
    if (!label) return;
    try {
      await api.digest.interests.create(label);
      setNewInterest("");
      queryClient.invalidateQueries({ queryKey: queryKeys.digestInterests.all });
      toast.success(t("settings.addInterest"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleToggleInterest = async (id: string, enabled: boolean) => {
    try {
      await api.digest.interests.updateEnabled(id, enabled);
      queryClient.invalidateQueries({ queryKey: queryKeys.digestInterests.all });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      if (msg.includes("max_active_interests")) {
        toast.error(t("settings.maxInterestsReached"));
      } else {
        toast.error(msg);
      }
    }
  };

  const handleDeleteInterest = async (id: string) => {
    try {
      await api.digest.interests.delete(id);
      queryClient.invalidateQueries({ queryKey: queryKeys.digestInterests.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
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
          <li key={interest.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
            <div className="flex items-center gap-3">
              <Toggle
                checked={interest.enabled}
                onChange={() => handleToggleInterest(interest.id, !interest.enabled)}
              />
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
        {(!interests || interests.length === 0) && (
          <p className="text-xs text-[var(--color-text-muted)]">
            No interests yet. Add some to focus your Discover curation.
          </p>
        )}
      </ul>
    </section>
  );
}
