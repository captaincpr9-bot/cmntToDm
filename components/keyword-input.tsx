"use client";

/**
 * Keyword Input
 *
 * Upgraded with Stitch design system: dark container, monospaced pink keyword tags,
 * and seamless keyboard shortcuts (Enter/Comma to add, Backspace to delete).
 */

import { useI18n } from "@/lib/i18n/provider";
import { useState, type KeyboardEvent } from "react";

interface KeywordInputProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  max?: number;
}

export default function KeywordInput({
  keywords,
  onChange,
  max = 10,
}: KeywordInputProps) {
  const { t } = useI18n();
  const [input, setInput] = useState("");

  function addKeyword(value: string) {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return;
    if (keywords.includes(trimmed)) return;
    if (keywords.length >= max) return;
    onChange([...keywords, trimmed]);
    setInput("");
  }

  function removeKeyword(keyword: string) {
    onChange(keywords.filter((k) => k !== keyword));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword(input);
    }
    if (e.key === "Backspace" && !input && keywords.length > 0) {
      removeKeyword(keywords[keywords.length - 1]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-[#141417] border border-white/8 min-h-[48px] focus-within:border-[#ff4c83] transition-colors">
        {keywords.map((keyword) => (
          <span
            key={keyword}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#27272a] text-[#ffb1c0] font-mono text-xs font-semibold border border-white/8 shadow-sm"
          >
            <span>{keyword}</span>
            <button
              type="button"
              onClick={() => removeKeyword(keyword)}
              aria-label={t("Remove {keyword}", { keyword })}
              className="text-[#71717a] hover:text-rose-400 text-xs font-bold transition-colors ml-0.5"
            >
              ✕
            </button>
          </span>
        ))}

        {keywords.length < max && (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addKeyword(input)}
            placeholder={
              keywords.length === 0
                ? "Type a keyword (e.g. LINK) and press Enter..."
                : "Add another..."
            }
            className="flex-1 min-w-[140px] bg-transparent text-xs text-white placeholder:text-[#71717a] focus:outline-none py-1 px-1"
          />
        )}
      </div>

      <p className="text-[11px] text-[#71717a]">
        Press Enter or comma to add. Max {max} keywords per campaign.
      </p>
    </div>
  );
}
