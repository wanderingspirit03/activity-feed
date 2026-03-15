"use client"

import { motion } from "framer-motion"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/time"
import type { RunOverview } from "@/lib/types"

type RunCardProps = {
  run: RunOverview
  isActive?: boolean
  onClick?: () => void
}

function getStatusCopy(phase: RunOverview["phase"]) {
  switch (phase) {
    case "working":
    case "understanding":
    case "reviewing":
      return { label: "✨ Working", badgeClass: "bg-blue-100 text-blue-700 border-blue-200", barClass: "bg-blue-500" }
    case "complete":
      return { label: "✓ Complete", badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200", barClass: "bg-emerald-500" }
    case "error":
      return { label: "⏸ Waiting", badgeClass: "bg-amber-100 text-amber-800 border-amber-200", barClass: "bg-amber-500" }
    case "queued":
    default:
      return { label: "🚀 Starting", badgeClass: "bg-violet-100 text-violet-700 border-violet-200", barClass: "bg-violet-500" }
  }
}

export function RunCard({ run, isActive = false, onClick }: RunCardProps) {
  const status = getStatusCopy(run.phase)
  const progress = Math.min(100, Math.max(0, run.progress))

  return (
    <motion.div
      layout
      whileHover={isActive ? { scale: 1.01 } : { scale: 1.005 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="h-full"
    >
      <Card
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(event) => {
          if (!onClick) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onClick()
          }
        }}
        className={cn(
          "h-full cursor-default gap-4 px-4 py-4 transition-colors",
          onClick && "cursor-pointer hover:bg-zinc-50",
          isActive && "border-blue-200 shadow-md"
        )}
      >
        <p className="line-clamp-2 text-sm font-medium text-zinc-900">{run.task}</p>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <motion.div
            className={cn("h-full rounded-full", status.barClass)}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className={cn("border text-xs", status.badgeClass)}>
            {status.label}
          </Badge>
          <span className="text-xs text-zinc-500">{formatRelativeTime(run.updatedAt)}</span>
        </div>
      </Card>
    </motion.div>
  )
}

export default RunCard
