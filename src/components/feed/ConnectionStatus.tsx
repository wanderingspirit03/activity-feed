"use client"

import { AnimatePresence, motion } from "framer-motion"

type ConnectionStatusProps = {
  isConnected: boolean
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <AnimatePresence mode="wait" initial={false}>
        {isConnected ? (
          <motion.span
            key="online"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18 }}
            className="relative flex size-2"
          >
            <motion.span
              className="absolute inset-0 rounded-full bg-emerald-500"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            />
          </motion.span>
        ) : (
          <motion.div
            key="offline"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2"
          >
            <span className="size-2 rounded-full bg-red-500" />
            <span className="text-[11px] text-zinc-500">Reconnecting...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ConnectionStatus
