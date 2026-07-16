import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { api } from "../../../api/client";
import { useAuth } from "../../auth/store";

export function PreferencesSection() {
  const { t, i18n } = useTranslation();
  const user = useAuth((s) => s.user);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
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
  );
}
