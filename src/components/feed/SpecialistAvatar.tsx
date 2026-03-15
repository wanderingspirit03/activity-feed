"use client"

import { Check } from "lucide-react"
import { motion } from "framer-motion"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type SpecialistAvatarProps = {
  name: string
  isWorking?: boolean
  className?: string
}

const specialistEmoji: Record<string, string> = {
  Researcher: "🔍",
  Builder: "🔨",
  Writer: "✍️",
  Troubleshooter: "🔧",
  Deployer: "🚀",
  Analyst: "📊",
  Assistant: "🤖",
}

export function SpecialistAvatar({ name, isWorking = false, className }: SpecialistAvatarProps) {
  const emoji = specialistEmoji[name] ?? specialistEmoji.Assistant

  return (
    <div className={cn("inline-flex flex-col items-center gap-1.5", className)}>
      <div className="relative">
        {isWorking ? (
          <motion.span
            className="absolute -inset-1 rounded-full border-2 border-blue-400/70"
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
          />
        ) : null}

        <Avatar className="size-10 border border-zinc-200 bg-white shadow-sm">
          <AvatarFallback className="bg-zinc-100 text-base">{emoji}</AvatarFallback>
        </Avatar>

        {!isWorking ? (
          <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border border-white bg-emerald-500 text-white">
            <Check className="size-2.5" />
          </span>
        ) : null}
      </div>

      <p className="max-w-[90px] text-center text-[11px] text-zinc-500">{name}</p>
    </div>
  )
}

export default SpecialistAvatar
