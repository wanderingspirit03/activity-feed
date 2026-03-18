"use client";

import { Check, Loader2, Pause, Play, X } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { type OpsData, useOpsStore } from "@/stores/ops-store";

type OpActionsProps = {
	opId: string;
	status: string;
	onAction?: () => void;
};

type ActionType = "approve" | "pause" | "resume" | "cancel";
type Tone = "emerald" | "blue" | "amber" | "red";

type ActionButton = {
	action: ActionType;
	label: string;
	icon: typeof Check;
	tone: Tone;
};

const ACTIONS_BY_STATUS: Record<string, ActionButton[]> = {
	planning: [{ action: "approve", label: "Approve", icon: Check, tone: "emerald" }],
	approved: [{ action: "resume", label: "Start", icon: Play, tone: "blue" }],
	running: [
		{ action: "pause", label: "Pause", icon: Pause, tone: "amber" },
		{ action: "cancel", label: "Cancel", icon: X, tone: "red" },
	],
	paused: [
		{ action: "resume", label: "Resume", icon: Play, tone: "blue" },
		{ action: "cancel", label: "Cancel", icon: X, tone: "red" },
	],
};

const TONE_STYLES: Record<Tone, string> = {
	emerald: "border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/10 focus-visible:ring-emerald-400/60",
	blue: "border-blue-500/60 text-blue-300 hover:bg-blue-500/10 focus-visible:ring-blue-400/60",
	amber: "border-amber-500/60 text-amber-300 hover:bg-amber-500/10 focus-visible:ring-amber-400/60",
	red: "border-red-500/60 text-red-300 hover:bg-red-500/10 focus-visible:ring-red-400/60",
};

function getOptimisticStatus(currentStatus: string, action: ActionType): string {
	switch (action) {
		case "approve":
			return "approved";
		case "pause":
			return "paused";
		case "cancel":
			return "cancelled";
		case "resume":
			return currentStatus === "approved" ? "running" : "running";
		default:
			return currentStatus;
	}
}

function buildOptimisticOp(existing: OpsData | undefined, opId: string, status: string): OpsData {
	if (existing) {
		return {
			...existing,
			status,
			updatedAt: Date.now(),
		};
	}

	const now = Date.now();
	return {
		opId,
		title: opId,
		status,
		features: [],
		currentPhase: 0,
		totalPhases: 0,
		startedAt: now,
		updatedAt: now,
		events: [],
	};
}

export default function OpActions({ opId, status, onAction }: OpActionsProps) {
	const addOrUpdateOp = useOpsStore((state) => state.addOrUpdateOp);
	const existingOp = useOpsStore((state) => state.ops.find((op) => op.opId === opId));
	const [loading, setLoading] = useState<Record<ActionType, boolean>>({
		approve: false,
		pause: false,
		resume: false,
		cancel: false,
	});

	const actionButtons = ACTIONS_BY_STATUS[status] ?? [];
	const isAnyLoading = useMemo(() => Object.values(loading).some(Boolean), [loading]);

	const handleAction = async (action: ActionType) => {
		setLoading((prev) => ({ ...prev, [action]: true }));

		try {
			const response = await fetch(`/api/ops/${opId}/action`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action }),
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as { error?: string } | null;
				throw new Error(payload?.error ?? "Failed to send action");
			}

			const optimisticStatus = getOptimisticStatus(status, action);
			addOrUpdateOp(buildOptimisticOp(existingOp, opId, optimisticStatus));
			onAction?.();
		} catch (error) {
			console.error("Failed to submit op action", error);
		} finally {
			setLoading((prev) => ({ ...prev, [action]: false }));
		}
	};

	if (actionButtons.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			{actionButtons.map((button) => {
				const Icon = button.icon;
				const isLoading = loading[button.action];

				return (
					<button
						key={`${button.action}-${button.label}`}
						type="button"
						onClick={() => void handleAction(button.action)}
						disabled={isAnyLoading}
						className={cn(
							"inline-flex h-8 items-center gap-1.5 rounded-md border bg-transparent px-2.5 text-xs font-medium transition-colors",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60",
							TONE_STYLES[button.tone],
						)}
					>
						{isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
						<span>{button.label}</span>
					</button>
				);
			})}
		</div>
	);
}
