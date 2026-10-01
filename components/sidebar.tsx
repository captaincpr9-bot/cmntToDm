"use client";

/**
 * Sidebar Navigation
 *
 * Upgraded with Stitch design system: dark surfaces, Instagram sunset gradients,
 * rich icons, live webhook/worker status card, and clean responsive behavior.
 */

import LanguageSwitcher from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n/provider";
import Link from "next/link";
import Image from "next/image";
import { zernioLink } from "@/lib/zernio-links";
import type { StaticMessageKey } from "@/lib/i18n";
import { usePathname } from "next/navigation";
import {
  GridIcon,
  AnalyticsIcon,
  ChatIcon,
  BoltIcon,
  LogsIcon,
  SettingsIcon,
  DiagnosticsIcon,
  InstagramIcon,
  CloseIcon,
} from "@/components/icons";

interface NavItemConfig {
  label: StaticMessageKey;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string | number;
}

const navItems: readonly NavItemConfig[] = [
  { label: "Dashboard", href: "/dashboard", icon: GridIcon },
  { label: "Campaigns", href: "/campaigns", icon: BoltIcon },
  { label: "Inbox", href: "/inbox", icon: ChatIcon },
  { label: "Overview", href: "/overview", icon: AnalyticsIcon },
  { label: "DM Logs", href: "/logs", icon: LogsIcon },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
  { label: "Diagnostics", href: "/diagnostics", icon: DiagnosticsIcon },
] as const;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
}

export default function Sidebar({
  isOpen,
  onClose,
  workspaceName,
}: SidebarProps) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-dvh w-[260px] max-w-[85vw] shrink-0 bg-[#0e0e11] border-r border-white/8 flex flex-col justify-between
          transition-transform duration-200 ease-out
          lg:h-full lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header & Logo */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b border-white/8"
            style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}
          >
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 group"
              onClick={onClose}
            >
              <div className="w-8 h-8 rounded-lg bg-ig-gradient flex items-center justify-center text-white shadow-ig-glow">
                <InstagramIcon size={18} className="text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base tracking-tight text-white group-hover:text-white/90">
                  OpenReply
                </span>
                <span className="bg-ig-gradient text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm leading-none">
                  PRO
                </span>
              </div>
            </Link>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-md text-muted hover:text-white hover:bg-surface-hover"
              aria-label="Close sidebar"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  className={`
                    group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-150
                    ${
                      isActive
                        ? "bg-[#27272a] text-white font-medium border border-white/10 shadow-[0_1px_4px_rgba(0,0,0,0.4)]"
                        : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]"
                    }
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`transition-colors ${
                        isActive
                          ? "text-[#ff4c83]"
                          : "text-[#71717a] group-hover:text-white"
                      }`}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="truncate">{t(item.label)}</span>
                  </div>

                  {item.badge && (
                    <span className="bg-[#ff4c83] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Area: Account Status, Language & Sponsor */}
        <div className="p-3 border-t border-white/8 flex flex-col gap-2.5 bg-[#0e0e11]">
          {/* Live Connection Card */}
          <div className="p-3 rounded-lg bg-[#18181b] border border-white/8 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-white truncate max-w-[130px]">
                {workspaceName}
              </span>
              <span className="text-[10px] font-semibold text-[#e3b5ff] bg-[#6a1c9b]/30 px-1.5 py-0.5 rounded">
                IG LIVE
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#a1a1aa]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="truncate">Webhook Active</span>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="px-1">
            <LanguageSwitcher />
          </div>

          {/* Sponsor Credit */}
          <a
            href={zernioLink({ placement: "sidebar" })}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="flex items-center justify-between px-2 py-1.5 text-[11px] text-[#71717a] hover:text-[#a1a1aa] transition-colors"
          >
            <span>{t("Supported by")}</span>
            <Image
              src="/brand/zernio-primary.svg"
              alt="Zernio"
              width={56}
              height={18}
              className="opacity-80 hover:opacity-100 transition-opacity"
            />
          </a>
        </div>
      </aside>
    </>
  );
}
