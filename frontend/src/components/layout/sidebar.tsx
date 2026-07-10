import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { FileText, PenLine, Library, Settings, LogOut } from "lucide-react";
import { useAuth } from "../../features/auth/store";

const navItems = [
  { to: "/digest", label: "nav.digest", icon: FileText },
  { to: "/compose", label: "nav.compose", icon: PenLine },
  { to: "/library", label: "nav.library", icon: Library },
  { to: "/settings", label: "nav.settings", icon: Settings },
] as const;

export function Sidebar() {
  const { t } = useTranslation();
  const logout = useAuth((s) => s.logout);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-[var(--color-border)]/20 bg-[var(--color-bg-base)] p-6">
      <Link to="/digest" className="mb-8 flex items-center gap-2">
        <span className="font-[var(--font-display)] text-xl font-semibold text-[var(--color-bg-surface)]">
          Forge
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/5 hover:text-[var(--color-bg-surface)] [&.active]:bg-white/10 [&.active]:text-[var(--color-accent-primary)]"
          >
            <Icon size={18} />
            {t(label)}
          </Link>
        ))}
      </nav>

      <button
        onClick={logout}
        className="cursor-pointer flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-danger)]"
      >
        <LogOut size={18} />
        {t("auth.logout")}
      </button>
    </aside>
  );
}
