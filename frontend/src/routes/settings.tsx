import { useTranslation } from "react-i18next";
import { useAuth } from "../features/auth/store";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const user = useAuth((s) => s.user);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-[var(--font-display)] text-2xl">{t("settings.title")}</h1>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">
          {t("settings.language")}
        </h2>
        <div className="flex gap-2">
          {["en", "pt", "es"].map((lng) => (
            <button
              key={lng}
              onClick={() => changeLanguage(lng)}
              className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition-colors ${
                i18n.language === lng
                  ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]"
                  : "border-[var(--color-border)]/20 text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50"
              }`}
            >
              {lng.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {user && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">Profile</h2>
          <p className="text-sm text-[var(--color-bg-surface)]">{user.name}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{user.email}</p>
        </section>
      )}
    </div>
  );
}
