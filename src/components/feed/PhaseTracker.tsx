"use client";

import { RunPhase } from "@/lib/types";
import { CheckCircle2, Clock, Cpu, FileOutput, Search, MessageSquare, Play } from "lucide-react";

export function PhaseTracker({ currentPhase }: { currentPhase: RunPhase }) {
  const steps: { key: RunPhase; label: string; icon: React.ReactNode }[] = [
    { key: "queued", label: "Queued", icon: <Clock className="w-4 h-4" /> },
    { key: "understanding", label: "Thinking", icon: <Cpu className="w-4 h-4" /> },
    { key: "working", label: "Working", icon: <Search className="w-4 h-4" /> },
    { key: "reviewing", label: "Reviewing", icon: <MessageSquare className="w-4 h-4" /> },
    { key: "complete", label: "Done", icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  const currentIndex = steps.findIndex((s) => s.key === currentPhase);

  return (
    <div className="w-full relative py-6">
      <div className="flex items-center justify-between relative z-10">
        {steps.map((step, idx) => {
          const isActive = idx === currentIndex;
          const isPast = idx < currentIndex;
          const isError = currentPhase === "error";

          return (
            <div key={step.key} className="flex flex-col items-center gap-2 flex-1 relative group">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative bg-white
                ${
                  isActive
                    ? `border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400 ${!isError && 'shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse'}`
                    : isPast
                    ? "border-green-500 text-green-600 bg-green-50 dark:border-green-400 dark:bg-green-950/30"
                    : "border-neutral-200 text-neutral-400 dark:border-neutral-800 dark:text-neutral-500"
                }
                ${isError && isActive ? "!border-red-500 !text-red-500 !shadow-[0_0_15px_rgba(239,68,68,0.3)]" : ""}
                `}
              >
                {step.icon}
                
                {isActive && !isError && (
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-blue-500"></div>
                )}
              </div>
              <span
                className={`text-xs font-medium transition-colors
                  ${
                    isActive
                      ? "text-blue-700 dark:text-blue-300"
                      : isPast
                      ? "text-neutral-700 dark:text-neutral-300"
                      : "text-neutral-400 dark:text-neutral-500"
                  }
                  ${isError && isActive ? "!text-red-600" : ""}
                `}
              >
                {step.label}
              </span>

              {/* Connecting line (render on all but last) */}
              {idx < steps.length - 1 && (
                <div 
                  className={`absolute top-5 left-[50%] w-full h-[2px] -z-10 transition-colors duration-[800ms]
                    ${isPast ? "bg-green-500 dark:bg-green-400" : "bg-neutral-200 dark:bg-neutral-800"}
                  `} 
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}