"use client";

import { RunOverview } from "@/lib/types";
import { PhaseTracker } from "./PhaseTracker";
import { ActivityCard } from "./ActivityCard";
import { SpecialistAvatar } from "./SpecialistAvatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";

export function RunCard({ run }: { run: RunOverview }) {
  const isComplete = run.phase === "complete";
  const isError = run.phase === "error";

  return (
    <Card className="w-full shadow-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
      <CardHeader className="border-b bg-neutral-50 dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
              {run.task}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 capitalize whitespace-nowrap">
                {run.specialist || "Assistant"} Specialist
              </span>
              <span className="text-neutral-400">&bull;</span>
              <span className="text-neutral-500 tabular-nums">
                Started {formatDistanceToNow(run.startedAt, { addSuffix: true })}
              </span>
            </CardDescription>
          </div>
          {run.specialist && (
            <div className="shrink-0 flex items-center justify-center p-1 border rounded-full bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-sm relative overflow-visible z-50">
               <SpecialistAvatar role={run.specialist} />
               {!isComplete && !isError && (
                 <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-neutral-800 rounded-full"></span>
               )}
            </div>
          )}
        </div>

        <div className="mt-6 pointer-events-none relative z-0">
          <PhaseTracker currentPhase={run.phase} />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="bg-neutral-50/50 dark:bg-neutral-900/50 border-y border-neutral-100 dark:border-neutral-800 px-6 py-3 flex items-center justify-between shadow-sm relative z-20">
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Live Activity Timeline</h3>
          {!isComplete && !isError && (
            <div className="flex items-center gap-2">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
               </span>
               <span className="text-xs text-neutral-500">Listening to updates...</span>
            </div>
          )}
        </div>

        <ScrollArea className="h-[400px] w-full bg-white dark:bg-neutral-950 px-6 py-4">
          <div className="space-y-4 pr-4 pl-2 pb-6 flex flex-col pt-2 relative z-10">
            <AnimatePresence mode="popLayout" initial={false}>
              {run.activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  layout
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                   <ActivityCard activity={activity} />
                   {index < run.activities.length - 1 && (
                     <div className="w-[2px] h-4 bg-neutral-200 dark:bg-neutral-800 mx-auto mt-4 -mb-4 opacity-50" />
                   )}
                </motion.div>
              ))}
              {run.activities.length === 0 && (
                 <motion.div
                   key="empty"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="text-center py-12 text-neutral-400 flex flex-col items-center justify-center h-full gap-3"
                 >
                   <div className="w-12 h-12 rounded-full border-2 border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-center mb-2 animate-spin duration-[4000ms]">
                      <span className="text-neutral-300">⏳</span>
                   </div>
                   <p>Waiting for the first activity...</p>
                 </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}