"use client"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { ChevronDownIcon, Users } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"

export type TaskProps = ComponentProps<typeof Collapsible>
export const Task = ({ className, ...props }: TaskProps) => (
  <Collapsible className={cn("group not-prose mb-4 w-full rounded-md border", className)} {...props} />
)

export const TaskTrigger = ({ title, className }: { title: string; className?: string }) => (
  <CollapsibleTrigger className={cn("flex w-full items-center justify-between gap-4 p-3", className)}>
    <div className="flex items-center gap-2">
      <Users className="size-4 text-muted-foreground" />
      <span className="font-medium text-sm">{title}</span>
    </div>
    <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
)

export const TaskContent = ({ className, children }: { className?: string; children: ReactNode }) => (
  <CollapsibleContent className={cn("space-y-2 p-4", className)}>
    {children}
  </CollapsibleContent>
)

export const TaskItem = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn("flex items-center gap-2 text-sm", className)}>
    {children}
  </div>
)
