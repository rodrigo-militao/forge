import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { FileText, PenLine, Library, Settings, LogOut, PanelLeftClose, PanelLeft, Mail } from "lucide-react";
import { useAuth } from "../../features/auth/store";
import { useCallback, useEffect, useState } from "react";

const navItems = [
  { to: "/digest", label: "nav.digest", icon: FileText },
  { to: "/newsletters", label: "nav.newsletters", icon: Mail },
  { to: "/compose", label: "nav.compose", icon: PenLine },
  { to: "/library", label: "nav.library", icon: Library },
  { to: "/settings", label: "nav.settings", icon: Settings },
] as const;

const STORAGE_KEY = "forge:sidebar-collapsed";

export function Sidebar() {
  const { t } = useTranslation();
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate({ to: "/login" });
  }, [logout, navigate]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <aside
      data-collapsed={collapsed}
      className="flex h-full flex-col border-r border-[var(--color-border)]/20 bg-[var(--color-bg-base)] p-4 transition-[width] duration-200 data-[collapsed=true]:w-16 data-[collapsed=false]:w-64"
    >
      <Link
        to="/digest"
        className="mb-6 flex items-center"
        tabIndex={collapsed ? -1 : 0}
      >
        {collapsed ? (
          <img src="/favicon.svg" alt="F" className="mx-auto h-7 w-7" />
        ) : (
          <img src="/logo.svg" alt="Forge" className="w-full max-w-[160px]" />
        )}
      </Link>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--color-bg-surface)] [&.active]:bg-[var(--color-active-subtle)] [&.active]:text-[var(--color-accent-primary)] ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title={collapsed ? t(label) : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{t(label)}</span>}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-2">
        <button
          onClick={toggleCollapsed}
          className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--color-bg-surface)] ${
            collapsed ? "justify-center px-0" : ""
          }`}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
        >
          {collapsed ? <PanelLeft size={18} className="shrink-0" /> : <PanelLeftClose size={18} className="shrink-0" />}
          {!collapsed && <span>{t("nav.collapse")}</span>}
        </button>

        <button
          onClick={handleLogout}
          className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--color-bg-surface)] ${
            collapsed ? "justify-center px-0" : ""
          }`}
          title={collapsed ? t("auth.logout") : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{t("auth.logout")}</span>}
        </button>
      </div>
    </aside>
  );
}
