"use client"

import { Check } from "lucide-react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import type { RunPhase } from "@/lib/types"

type PhaseTrackerProps = {
  currentPhase: RunPhase
  className?: string
}

const phases: Array<{ key: Exclude<RunPhase, "error">; label: string }> = [
  { key: "queued", label: "Received" },
  { key: "understanding", label: "Understanding" },
  { key: "working", label: "Working" },
  { key: "reviewing", label: "Reviewing" },
  { key: "complete", label: "Complete" },
]

function getPhaseIndex(phase: RunPhase): number {
  if (phase === "error") return 3
  return Math.max(0, phases.findIndex((item) => item.key === phase))
}

export function PhaseTracker({ currentPhase, className }: PhaseTrackerProps) {
  const currentIndex = getPhaseIndex(currentPhase)
  const isFinished = currentPhase === "complete"

  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {phases.map((phase, index) => {
          const isCompleted = index < currentIndex || (isFinished && index === currentIndex)
          const isActive = !isFinished && index === currentIndex
          const isUpcoming = index > currentIndex

          let segmentState: "done" | "current" | "upcoming" = "upcoming"
          if (index < phases.length - 1) {
            if (isFinished || currentIndex > index) segmentState = "done"
            else if (currentIndex === index) segmentState = "current"
          }

          return (
            <div key={phase.key} className="relative flex flex-col items-center text-center">
              {index < phases.length - 1 ? (
                <div className="pointer-events-none absolute top-4 left-[58%] z-0 h-0.5 w-[92%] sm:top-4.5">
                  <div
                    className={cn(
                      "absolute inset-0",
                      segmentState === "done" ? "bg-blue-500" : "border-t border-dashed border-zinc-300"
                    )}
                  />
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-blue-500"
                    initial={false}
                    animate={{
                      width:
                        segmentState === "done"
                          ? "100%"
                          : segmentState === "current"
                            ? "38%"
                            : "0%",
                    }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                  />
                </div>
              ) : null}

              <motion.div
                layout
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className={cn(
                  "relative z-10 flex items-center justify-center rounded-full border bg-white",
                  isActive ? "size-10 border-blue-500 bg-blue-500 sm:size-11" : "size-8 sm:size-9",
                  isCompleted && "border-blue-500 bg-blue-500 text-white",
                  isUpcoming && "border-zinc-300 text-zinc-400"
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : (
                  <span className={cn("size-2.5 rounded-full", isActive ? "bg-white" : "bg-zinc-300")} />
                )}

                {isActive ? (
                  <motion.span
                    className="absolute inset-[-6px] rounded-full border-2 border-blue-400/80"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.85, 0.3, 0.85] }}
                    transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  />
                ) : null}
              </motion.div>

              <motion.p
                initial={false}
                animate={{ opacity: isUpcoming ? 0.56 : 1 }}
                className={cn(
                  "mt-2 max-w-[78px] text-[11px] leading-tight text-zinc-500 sm:max-w-[120px] sm:text-xs",
                  (isCompleted || isActive) && "font-medium text-zinc-700"
                )}
              >
                {phase.label}
              </motion.p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PhaseTracker
