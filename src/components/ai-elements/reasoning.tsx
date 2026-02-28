"use client"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { Brain, ChevronDownIcon } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean
  duration?: number
}

export const Reasoning = ({ className, isStreaming, duration, ...props }: ReasoningProps) => (
  <Collapsible className={cn("group not-prose mb-4 w-full rounded-md border", className)} {...props} />
)

export const ReasoningTrigger = ({ className }: { className?: string }) => (
  <CollapsibleTrigger className={cn("flex w-full items-center justify-between gap-4 p-3", className)}>
    <div className="flex items-center gap-2">
      <Brain className="size-4 text-muted-foreground animate-pulse" />
      <span className="font-medium text-sm">Thinking...</span>
    </div>
    <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
)

export const ReasoningContent = ({ className, children }: { className?: string; children: ReactNode }) => (
  <CollapsibleContent className={cn("p-4 text-sm text-muted-foreground", className)}>
    {children}
  </CollapsibleContent>
)
