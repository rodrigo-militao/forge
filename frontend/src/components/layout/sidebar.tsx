import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  FileText,
  PenLine,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Mail,
  Lightbulb,
  House,
} from "lucide-react";
import { useAuth } from "../../features/auth/store";
import { useCallback, useEffect, useState } from "react";

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

  const location = useLocation();

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

  const linkClass = (to: string) => {
    const isActive = to === "/home"
      ? location.pathname === "/home"
      : location.pathname === to || location.pathname.startsWith(to + "/");
    const itemHeight = "py-[9px]";
    return `flex items-center gap-3 rounded-lg px-3 ${itemHeight} text-sm transition-colors cursor-pointer ${
      isActive
        ? "bg-[var(--color-active-subtle)] text-[var(--color-accent-primary)]"
        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--color-bg-surface)]"
    } ${collapsed ? "justify-center px-0" : ""}`;
  };

  const groupLabelClass =
    "px-3 pt-4 pb-1 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]";

  const bottomItemClass = `flex cursor-pointer items-center gap-3 rounded-lg px-3 py-[9px] text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--color-bg-surface)] ${collapsed ? "justify-center px-0" : ""}`;

  return (
    <aside
      style={{ width: collapsed ? "4rem" : "16rem", transition: "width 300ms ease-out" }}
      className="flex h-full flex-col border-r border-[var(--color-border)]/20 bg-[var(--color-bg-base)] p-4"
    >
      {/* Header: logo + collapse toggle */}
      <div className={`relative mb-6 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        <Link to="/discover" className="flex items-center">
          {collapsed ? (
            <img src="/favicon.svg" alt="F" className="h-7 w-7" />
          ) : (
            <img src="/logo.svg" alt="Forge" className="w-full max-w-[160px]" />
          )}
        </Link>
        {/* Expand button — absolute when collapsed so it doesn't squeeze the favicon */}
        <button
          onClick={toggleCollapsed}
          className={`rounded-full bg-[#313131] p-1 text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[#3d3d3d] hover:text-[var(--color-bg-surface)] cursor-pointer ${
            collapsed ? "absolute -right-7" : ""
          }`}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1">
        <Link to="/home" className={linkClass("/home")} title={collapsed ? t("nav.home") : undefined}>
          <House size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{t("nav.home")}</span>}
        </Link>

        <div className="my-1 border-t border-[var(--color-border)]/10" />

        <Link to="/discover" className={linkClass("/discover")} title={collapsed ? t("nav.discover") : undefined}>
          <FileText size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{t("nav.discover")}</span>}
        </Link>

        {/* Content group */}
        {!collapsed && <div className={groupLabelClass}>{t("nav.content")}</div>}
        {collapsed && <div className="my-1 border-t border-[var(--color-border)]/20" />}

        <Link to="/content/articles" className={linkClass("/content/articles")} title={collapsed ? t("nav.articles") : undefined}>
          <PenLine size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{t("nav.articles")}</span>}
        </Link>
        <Link to="/content/newsletters" className={linkClass("/content/newsletters")} title={collapsed ? t("nav.newsletters") : undefined}>
          <Mail size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{t("nav.newsletters")}</span>}
        </Link>
        <Link to="/content/ideas" className={linkClass("/content/ideas")} title={collapsed ? t("nav.ideas") : undefined}>
          <Lightbulb size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{t("nav.ideas")}</span>}
        </Link>
      </nav>

      {/* Footer: settings + logout */}
      <div className="flex flex-col gap-1 border-t border-[var(--color-border)]/10 pt-2">
        <Link to="/settings" className={linkClass("/settings")} title={collapsed ? t("nav.settings") : undefined}>
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{t("nav.settings")}</span>}
        </Link>
        <button
          onClick={handleLogout}
          className={bottomItemClass}
          title={collapsed ? t("auth.logout") : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{t("auth.logout")}</span>}
        </button>
      </div>
    </aside>
  );
}
