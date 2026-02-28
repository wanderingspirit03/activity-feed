"use client";

export function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-2 w-2 rounded-full ${
          isConnected
            ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
            : "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]"
        }`}
      />
    </div>
  );
}
