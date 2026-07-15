import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  FileText,
  PenLine,
  Library,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Mail,
  Lightbulb,
  Plus,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../features/auth/store";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "forge:sidebar-collapsed";

const createOptions = [
  { to: "/content/articles" as const, label: "create.article", icon: PenLine },
  { to: "/content/newsletters" as const, label: "create.newsletter", icon: Mail },
  { to: "/content/ideas" as const, label: "create.idea", icon: Lightbulb },
];

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

  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  // Close create dropdown on outside click
  useEffect(() => {
    if (!createOpen) return;
    function handleClick(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) {
        setCreateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [createOpen]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate({ to: "/login" });
  }, [logout, navigate]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const linkClass = (isActive = false) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
      isActive
        ? "bg-[var(--color-active-subtle)] text-[var(--color-accent-primary)]"
        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--color-bg-surface)]"
    } ${collapsed ? "justify-center px-0" : ""}`;

  const groupLabelClass =
    "px-3 pt-4 pb-1 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]";

  return (
    <aside
      data-collapsed={collapsed}
      className="flex h-full flex-col border-r border-[var(--color-border)]/20 bg-[var(--color-bg-base)] p-4 transition-[width] duration-200 data-[collapsed=true]:w-16 data-[collapsed=false]:w-64"
    >
      <Link
        to="/discover"
        className="mb-6 flex items-center"
        tabIndex={collapsed ? -1 : 0}
      >
        {collapsed ? (
          <img src="/favicon.svg" alt="F" className="mx-auto h-7 w-7" />
        ) : (
          <img src="/logo.svg" alt="Forge" className="w-full max-w-[160px]" />
        )}
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {/* Discover */}
        <Link to="/discover" className={linkClass()} title={collapsed ? t("nav.discover") : undefined}>
          <FileText size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{t("nav.discover")}</span>}
        </Link>

        {/* Content group */}
        {!collapsed && <div className={groupLabelClass}>{t("nav.content")}</div>}
        {collapsed && <div className="my-1 border-t border-[var(--color-border)]/20" />}

        <Link to="/content/articles" className={linkClass()} title={collapsed ? t("nav.articles") : undefined}>
          <PenLine size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{t("nav.articles")}</span>}
        </Link>
        <Link to="/content/newsletters" className={linkClass()} title={collapsed ? t("nav.newsletters") : undefined}>
          <Mail size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{t("nav.newsletters")}</span>}
        </Link>
        <Link to="/content/ideas" className={linkClass()} title={collapsed ? t("nav.ideas") : undefined}>
          <Lightbulb size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{t("nav.ideas")}</span>}
        </Link>

        {/* Library */}
        <Link to="/library" className={linkClass()} title={collapsed ? t("nav.library") : undefined}>
          <Library size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{t("nav.library")}</span>}
        </Link>

        {/* Settings */}
        <Link to="/settings" className={linkClass()} title={collapsed ? t("nav.settings") : undefined}>
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{t("nav.settings")}</span>}
        </Link>
      </nav>

      <div className="flex flex-col gap-2">
        {/* + Create button */}
        <div className="relative" ref={createRef}>
          <button
            onClick={() => setCreateOpen((prev) => !prev)}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title={collapsed ? t("create.title") : undefined}
          >
            <Plus size={18} className="shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{t("create.title")}</span>
                <ChevronDown size={14} className={`shrink-0 transition-transform ${createOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </button>

          {createOpen && (
            <div className="absolute bottom-full left-0 z-50 mb-1 w-56 overflow-hidden rounded-lg border border-[var(--color-border)]/20 bg-[var(--color-surface-elevated)] shadow-lg">
              {createOptions.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setCreateOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--color-bg-surface)]"
                >
                  <Icon size={16} className="shrink-0" />
                  <span>{t(label)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

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
