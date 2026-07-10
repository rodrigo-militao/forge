import { useCallback, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../features/auth/store";

export function LoginPage() {
  const { t } = useTranslation();
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      try {
        await login(email, password);
        navigate({ to: "/digest" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
      }
    },
    [email, password, login, navigate],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)]">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-8">
        <h1 className="font-[var(--font-display)] text-3xl text-[var(--color-bg-surface)]">Forge</h1>
        <h2 className="text-lg text-[var(--color-text-secondary)]">{t("auth.login")}</h2>

        {error && (
          <p className="rounded bg-[var(--color-accent-danger)]/20 px-3 py-2 text-sm text-[var(--color-accent-danger)]">
            {error}
          </p>
        )}

        <input
          type="email"
          placeholder={t("auth.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-4 py-2 text-sm text-[var(--color-bg-surface)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)] focus:outline-none"
        />
        <input
          type="password"
          placeholder={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-4 py-2 text-sm text-[var(--color-bg-surface)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)] focus:outline-none"
        />

        <button
          type="submit"
          className="cursor-pointer w-full rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {t("auth.login")}
        </button>

        <p className="text-center text-sm text-[var(--color-text-muted)]">
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="text-[var(--color-accent-primary)] hover:underline">
            {t("auth.register")}
          </Link>
        </p>
      </form>
    </div>
  );
}
