"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

function languageTone(language: string) {
  const lang = language.toLowerCase()

  if (["ts", "tsx", "typescript"].includes(lang)) return "text-cyan-200"
  if (["js", "jsx", "javascript"].includes(lang)) return "text-amber-200"
  if (["json"].includes(lang)) return "text-emerald-200"
  if (["bash", "sh", "shell", "zsh"].includes(lang)) return "text-orange-200"

  return "text-zinc-200"
}

export function CodeBlock({ code, language = "json", className }: { code: string; language?: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="relative rounded-md border border-border/70 bg-muted/40">
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{language}</span>
        <button
          type="button"
          onClick={copyToClipboard}
          className="rounded border border-border/70 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className={cn(
          "max-h-60 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all px-3 pb-3 pt-2 text-xs font-mono",
          languageTone(language),
          className,
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}
