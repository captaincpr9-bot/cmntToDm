"use client";

import { useI18n } from "@/lib/i18n/provider";


export interface AccountOption {
  id: string;
  username: string;
  instagramId: string;
  name?: string | null;
}

interface AccountSelectProps {
  accounts: AccountOption[];
  value: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
  label?: string;
}

export default function AccountSelect({
  accounts,
  value,
  onChange,
  includeAll = true,
  label,
}: AccountSelectProps) {
  const { t } = useI18n();
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label ?? t("Instagram account")}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-52 rounded-xl border border-white/8 bg-[#0d0d10] px-3.5 py-2 text-sm text-white outline-none transition-colors focus:border-[#ff4c83]/50"
      >
        {includeAll && <option value="all" className="bg-[#141417] text-white">{t("All accounts")}</option>}
        {accounts.map((account) => (
          <option key={account.id} value={account.id} className="bg-[#141417] text-white">
            @{account.username}
          </option>
        ))}
      </select>
    </label>
  );
}

