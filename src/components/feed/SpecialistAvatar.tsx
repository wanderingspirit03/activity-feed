"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function SpecialistAvatar({ role, name, isWorking }: { role?: string; name?: string; isWorking?: boolean }) {
  const seeds: Record<string, string> = {
    "Researcher": "Felix",
    "Builder": "Sarah",
    "Troubleshooter": "Alex",
    "Deployer": "Jack",
    "Assistant": "Sam",
  };

  const seed = seeds[role ?? "Assistant"] ?? role ?? "Assistant";

  return (
    <Avatar className="w-12 h-12 border border-neutral-200 dark:border-neutral-800 shadow-inner">
      <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=f1f5f9`} alt={role ?? "Assistant"} />
      <AvatarFallback className="bg-neutral-100 text-neutral-600 font-medium">
        {(role ?? "AS").substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}