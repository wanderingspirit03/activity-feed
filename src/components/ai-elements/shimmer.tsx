"use client"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export function Shimmer({ children, className, duration = 2 }: { children: ReactNode; className?: string; duration?: number }) {
  return (
    <span
      className={cn(
        "inline-block bg-gradient-to-r from-muted-foreground via-foreground to-muted-foreground bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer",
        className
      )}
      style={{ animationDuration: `${duration}s` }}
    >
      {children}
    </span>
  )
}
