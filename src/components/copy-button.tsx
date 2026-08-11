"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type CopyButtonProps = {
  text: string;
  className?: string;
  /** Drop the label and show just the icon, for tight spots like the tone cards. */
  iconOnly?: boolean;
};

export function CopyButton({ text, className, iconOnly = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      // With the label gone the icon has to carry the meaning on its own.
      aria-label={iconOnly ? (copied ? "Copied" : "Copy") : undefined}
      title={iconOnly ? "Copy" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-glass-line-soft bg-white/38 py-2 text-xs font-semibold text-ink-2 backdrop-blur-xl transition hover:border-accent/35 hover:bg-white/50 hover:text-accent",
        iconOnly ? "px-2.5" : "px-3.5",
        className
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {iconOnly ? null : copied ? "Copied" : "Copy"}
    </button>
  );
}
