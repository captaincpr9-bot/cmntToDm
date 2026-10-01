"use client";

/**
 * Top Bar
 *
 * Upgraded with Stitch design system: dark backdrop blur, account indicators,
 * search shortcut, action shortcuts, and responsive mobile controls.
 */

import type { StaticMessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
import { usePathname } from "next/navigation";
import {
  MenuIcon,
  SearchIcon,
  BellIcon,
  InstagramIcon,
  ChevronDownIcon,
} from "@/components/icons";

const pageTitles: Record<string, StaticMessageKey> = {
  "/dashboard": "Dashboard",
  "/overview": "Overview",
  "/inbox": "Inbox",
  "/campaigns/import": "Import campaigns",
  "/campaigns": "Campaigns",
  "/campaigns/new": "New Campaign",
  "/automations": "Campaigns",
  "/automations/new": "New Campaign",
  "/logs": "DM Logs",
  "/settings": "Settings",
  "/diagnostics": "Diagnostics",
};

interface TopBarProps {
  onMenuClick: () => void;
  instagramUsername: string | null;
  instagramAccountCount: number;
}

export default function TopBar({
  onMenuClick,
  instagramUsername,
  instagramAccountCount,
}: TopBarProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const title: StaticMessageKey =
    pageTitles[pathname] ??
    (pathname.endsWith("/edit")
      ? "Edit campaign"
      : pathname.startsWith("/campaigns/")
      ? "Campaign details"
      : "Dashboard");

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 lg:px-8 border-b border-white/8 bg-[#0e0e11]/85 backdrop-blur-md transition-colors"
      style={{
        height: "calc(4rem + env(safe-area-inset-top))",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* Left side: Hamburger (mobile) + Page Title + Search */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-6">
        <button
          onClick={onMenuClick}
          className="lg:hidden shrink-0 p-2 rounded-lg border border-white/10 text-muted hover:text-white hover:bg-[#1f1f24] transition-colors"
          aria-label={t("Toggle sidebar")}
        >
          <MenuIcon size={18} />
        </button>

        <div className="flex items-center gap-2.5">
          <h1 className="truncate text-base font-semibold sm:text-lg text-white tracking-tight">
            {t(title)}
          </h1>
        </div>

        {/* Global Search trigger on desktop */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181b] border border-white/8 text-[#a1a1aa] hover:border-white/16 transition-colors cursor-pointer text-xs">
          <SearchIcon size={14} className="text-[#71717a]" />
          <span>Search automations...</span>
          <kbd className="font-mono text-[10px] bg-[#27272a] text-[#a1a1aa] px-1.5 py-0.5 rounded border border-white/5">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right side: Account Badge + Notifications + Connect Action */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {instagramAccountCount > 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181b] border border-white/8 text-xs font-medium text-white shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <InstagramIcon size={14} className="text-[#ff4c83]" />
            <span className="truncate max-w-[140px]">
              {instagramAccountCount > 1
                ? t("{count} accounts", { count: instagramAccountCount })
                : `@${instagramUsername}`}
            </span>
            <ChevronDownIcon size={12} className="text-[#71717a]" />
          </div>
        ) : (
          <a
            href="/api/instagram/connect"
            className="shrink-0 whitespace-nowrap text-xs font-semibold px-3 py-2 rounded-lg bg-ig-gradient text-white shadow-ig-glow hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-1.5"
          >
            <InstagramIcon size={14} />
            <span className="sm:hidden">{t("Connect")}</span>
            <span className="hidden sm:inline">{t("Connect Instagram")}</span>
          </a>
        )}

        {/* Notification Bell */}
        <button
          type="button"
          className="relative p-2 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#18181b] transition-colors"
          aria-label="Notifications"
        >
          <BellIcon size={18} />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#ff4c83] ring-2 ring-[#0e0e11]" />
        </button>
      </div>
    </header>
  );
}
