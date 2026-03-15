"use client";

import { ActivityItem } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import * as Lucide from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export function ActivityCard({ activity, isLatest }: { activity: ActivityItem; isLatest?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const iconName = activity.icon?.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("") ?? "";
  const IconComponent = (Lucide as any)[iconName] || Lucide.Circle;

  const hasDetails = !!(activity.toolArgs || activity.description);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      onClick={() => hasDetails && setExpanded(!expanded)}
      className={cn(
        "relative py-3 px-3 sm:py-4 sm:pr-4 sm:pl-10 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 shadow-sm transition-all duration-300",
        hasDetails && "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
        activity.isActive && "ring-2 ring-blue-500 shadow-md",
        activity.phase === "error" && "border-red-200 bg-red-50 dark:bg-red-950/20"
      )}
    >
      {/* Timeline line — hidden on mobile */}
      <div className={cn(
        "absolute left-3 top-[-1px] bottom-[-1px] w-[2px] bg-neutral-200 dark:bg-neutral-800 hidden sm:block",
        activity.isActive && "bg-blue-500",
        activity.phase === "error" && "bg-red-500"
      )} />

      {/* Timeline dot — hidden on mobile */}
      <div className={cn(
        "absolute left-1 top-5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center translate-y-[-50%] hidden sm:flex",
        activity.isActive ? "border-blue-500 text-blue-500" : "border-neutral-300 dark:border-neutral-600 text-neutral-400",
        activity.phase === "error" && "border-red-500 text-red-500"
      )}>
        {activity.isActive && !activity.phase.includes("error") ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <Lucide.Loader2 className="w-3 h-3 text-blue-500" />
          </motion.div>
        ) : activity.phase === "error" ? (
          <Lucide.X className="w-2 h-2 text-red-500" />
        ) : (
          <Lucide.Check className="w-2 h-2" />
        )}
      </div>

      <div className="flex gap-2 sm:gap-4">
        {/* Icon — smaller on mobile */}
        <div className={cn(
          "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shadow-inner shrink-0",
          activity.isActive ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
          activity.phase === "error" && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        )}>
           <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
              {activity.toolName && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 whitespace-nowrap shrink-0">
                  {activity.toolName}
                </span>
              )}
              <h4 className={cn(
                "font-medium text-xs sm:text-sm leading-tight m-0 truncate",
                activity.isActive ? "text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400",
                activity.phase === "error" && "text-red-700 dark:text-red-300"
              )}>
                {activity.title}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {hasDetails && (
                <Lucide.ChevronDown className={cn(
                  "w-3.5 h-3.5 text-neutral-400 transition-transform duration-200",
                  expanded && "rotate-180"
                )} />
              )}
              <span className="text-[10px] sm:text-xs text-neutral-400 tabular-nums hidden sm:inline">
                {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Expandable details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {activity.description && activity.description !== activity.title && (
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-snug">
                    {activity.description}
                  </p>
                )}
                {activity.toolArgs && (
                  <div className="mt-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2 overflow-x-auto max-h-48 overflow-y-auto">
                    <pre className="text-[10px] sm:text-xs font-mono text-neutral-500 dark:text-neutral-400 whitespace-pre-wrap break-all">
                      {typeof activity.toolArgs === 'string' ? activity.toolArgs : JSON.stringify(activity.toolArgs, null, 2)}
                    </pre>
                  </div>
                )}
                <span className="text-[10px] text-neutral-400 tabular-nums mt-1 inline-block sm:hidden">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress bar */}
          {activity.isActive && typeof activity.progress === 'number' && activity.progress > 0 && (
             <div className="mt-2 w-full bg-neutral-100 dark:bg-neutral-800 h-1 sm:h-1.5 rounded-full overflow-hidden">
               <motion.div
                 initial={{ width: 0 }}
                 animate={{ width: `${Math.min(activity.progress, 100)}%` }}
                 transition={{ duration: 0.5, ease: "easeOut" }}
                 className="h-full bg-blue-500 rounded-full"
               />
             </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
