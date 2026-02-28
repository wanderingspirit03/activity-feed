"use client";

import { ActivityItem } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import * as Lucide from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function ActivityCard({ activity }: { activity: ActivityItem }) {
  const iconName = activity.icon?.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("") ?? "";
  const IconComponent = (Lucide as any)[iconName] || Lucide.Circle;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative py-4 pr-4 pl-10 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 shadow-sm transition-all duration-300",
        activity.isActive && "ring-2 ring-blue-500 shadow-md",
        activity.phase === "error" && "border-red-200 bg-red-50 dark:bg-red-950/20"
      )}
    >
      <div className={cn(
        "absolute left-3 top-[-1px] bottom-[-1px] w-[2px] bg-neutral-200 dark:bg-neutral-800",
        activity.isActive && "bg-blue-500",
        activity.phase === "error" && "bg-red-500"
      )} />

      <div className={cn(
        "absolute left-1 top-5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center translate-y-[-50%]",
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

      <div className="flex gap-4">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shadow-inner shrink-0",
          activity.isActive ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
          activity.phase === "error" && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        )}>
           <IconComponent className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={cn(
              "font-medium text-sm leading-none m-0",
              activity.isActive ? "text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400",
              activity.phase === "error" && "text-red-700 dark:text-red-300"
            )}>
              {activity.title}
            </h4>
            <span className="text-xs text-neutral-400 tabular-nums shrink-0 ml-4">
              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
            </span>
          </div>

          {activity.description && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 leading-snug">
              {activity.description}
            </p>
          )}

          {activity.isActive && typeof activity.progress === 'number' && activity.progress > 0 && (
             <div className="mt-3 w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
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