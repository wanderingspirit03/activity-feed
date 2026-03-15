"use client"

import {
  AlertTriangle,
  Brain,
  CheckCircle,
  Circle,
  Eye,
  FileText,
  Search,
  Send,
  Sparkles,
  Terminal,
  Users,
  type LucideIcon,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/time"
import type { ActivityItem } from "@/lib/types"

type ActivityCardProps = {
  activity: ActivityItem
  isLatest?: boolean
}

const iconMap: Record<string, LucideIcon> = {
  brain: Brain,
  search: Search,
  "file-text": FileText,
  send: Send,
  terminal: Terminal,
  users: Users,
  check: CheckCircle,
  "alert-triangle": AlertTriangle,
  sparkles: Sparkles,
  eye: Eye,
  circle: Circle,
}

export function ActivityCard({ activity, isLatest = false }: ActivityCardProps) {
  const isError = activity.phase === "error"
  const isComplete = activity.phase === "complete"
  const isActive = Boolean(activity.isActive)
  const Icon = isError ? AlertTriangle : (iconMap[activity.icon ?? "circle"] ?? Circle)

  return (
    <AnimatePresence mode="popLayout">
      <motion.article
        key={activity.id}
        layout
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 16 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className={cn(
          "group relative overflow-hidden rounded-xl border bg-white px-4 py-3 shadow-sm",
          "before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-full before:bg-transparent",
          isActive && "border-blue-200 bg-blue-50/60 before:bg-blue-500",
          isError && "border-amber-200 bg-amber-50/60 before:bg-amber-500",
          isComplete && "bg-zinc-50/70 text-zinc-600"
        )}
      >
        <div className="flex gap-3">
          <div className="relative flex min-h-[54px] w-8 shrink-0 justify-center">
            <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-zinc-200" />

            <div
              className={cn(
                "relative z-10 mt-1 flex size-8 items-center justify-center rounded-full border bg-white",
                isActive && "border-blue-300 bg-blue-100 text-blue-700",
                isComplete && "border-emerald-300 bg-emerald-100 text-emerald-700",
                isError && "border-amber-300 bg-amber-100 text-amber-700",
                !isActive && !isComplete && !isError && "border-zinc-300 text-zinc-500"
              )}
            >
              {isComplete ? <CheckCircle className="size-4" /> : <Icon className="size-4" />}
            </div>

            {isActive ? (
              <motion.span
                className="absolute top-[-2px] right-[-4px] z-20 size-2.5 rounded-full bg-blue-500"
                animate={{ scale: [1, 1.45, 1], opacity: [1, 0.35, 1] }}
                transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h4
                className={cn(
                  "text-sm leading-snug font-medium text-zinc-900",
                  isComplete && "text-zinc-700",
                  isError && "text-amber-900"
                )}
              >
                {activity.title}
              </h4>

              {isLatest ? (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                  Latest
                </span>
              ) : null}
            </div>

            {activity.description ? (
              <p
                className={cn(
                  "mt-1 text-xs leading-relaxed text-zinc-600",
                  isComplete && "text-zinc-500",
                  isError && "text-amber-800"
                )}
              >
                {activity.description}
              </p>
            ) : null}

            <p className="mt-2 text-[11px] text-zinc-400">{formatRelativeTime(activity.timestamp)}</p>
          </div>
        </div>
      </motion.article>
    </AnimatePresence>
  )
}

export default ActivityCard
