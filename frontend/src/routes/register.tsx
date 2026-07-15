import { useCallback, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../features/auth/store";

export function RegisterPage() {
  const { t } = useTranslation();
  const register = useAuth((s) => s.register);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      try {
        await register(email, password, name);
        navigate({ to: "/discover" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
      }
    },
    [email, password, name, register, navigate],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)]">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-8">
        <img src="/logo.svg" alt="Forge" className="mx-auto w-56" />
        <h2 className="text-lg text-[var(--color-text-secondary)]">{t("auth.register")}</h2>

        {error && (
          <p className="rounded bg-[var(--color-accent-danger)]/20 px-3 py-2 text-sm text-[var(--color-accent-danger)]">
            {error}
          </p>
        )}

        <input
          type="text"
          placeholder={t("auth.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)]/20 bg-white/5 px-4 py-2 text-sm text-[var(--color-bg-surface)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)] focus:outline-none"
        />
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
          {t("auth.register")}
        </button>

        <p className="text-center text-sm text-[var(--color-text-muted)]">
          {t("auth.hasAccount")}{" "}
          <Link to="/login" className="text-[var(--color-accent-primary)] hover:underline">
            {t("auth.login")}
          </Link>
        </p>
      </form>
    </div>
  );
}
