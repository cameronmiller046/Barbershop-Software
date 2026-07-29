"use client";

import { useState } from "react";

export function CopyButton({ text, className, label = "Copy link" }: { text: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch { /* clipboard unavailable */ }
      }}
      className={className}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
