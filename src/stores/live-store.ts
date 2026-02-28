"use client";

import { create } from "zustand";

export type ActivityItem = {
	id: string;
	type: string;
	title: string;
	toolName?: string;
	toolArgs?: string;
	result?: string;
	status: "running" | "success" | "error";
	startedAt: number;
	completedAt?: number;
	progress?: number;
};

export type RunData = {
	runId: string;
	taskPreview: string;
	status: string;
	startedAt: number;
	lastAt: number;
	tools: ActivityItem[];
	currentPhase: string;
};

type WsEnvelope = {
	type?: string;
	data?: any;
};

type RawRun = {
	runId: string;
	task?: string;
	phase?: string;
	startedAt?: number;
	updatedAt?: number;
	activities?: any[];
};

type RawActivity = {
	id?: string;
	type?: string;
	title?: string;
	description?: string;
	toolName?: string;
	toolArgs?: string;
	result?: string;
	status?: string;
	progress?: number;
	timestamp?: number;
	startedAt?: number;
	completedAt?: number;
	runId?: string;
	phase?: string;
	isActive?: boolean;
};

type LiveStore = {
	runs: Map<string, RunData>;
	isConnected: boolean;
	lastEventAt: number | null;
	addEvent: (event: unknown) => void;
	setConnected: (value: boolean) => void;
	clearRuns: () => void;
};

function normalizeActivity(item: RawActivity): ActivityItem {
	const startedAt = item.startedAt ?? item.timestamp ?? Date.now();
	const inferredStatus: ActivityItem["status"] =
		item.status === "error"
			? "error"
			: item.status === "success" || item.isActive === false
				? "success"
				: "running";

	return {
		id: item.id ?? `${item.toolName ?? "event"}-${startedAt}`,
		type: item.type ?? "activity",
		title: item.title ?? item.description ?? item.toolName ?? "Activity",
		toolName: item.toolName,
		toolArgs: item.toolArgs,
		result: item.result,
		status: inferredStatus,
		startedAt,
		completedAt: item.completedAt ?? (inferredStatus === "running" ? undefined : Date.now()),
		progress: item.progress,
	};
}

function normalizeRun(run: RawRun): RunData {
	return {
		runId: run.runId,
		taskPreview: run.task ?? "",
		status: run.phase ?? "queued",
		startedAt: run.startedAt ?? Date.now(),
		lastAt: run.updatedAt ?? Date.now(),
		tools: (run.activities ?? []).map((activity) => normalizeActivity(activity)),
		currentPhase: run.phase ?? "queued",
	};
}

export const useLiveStore = create<LiveStore>((set) => ({
	runs: new Map(),
	isConnected: false,
	lastEventAt: null,
	addEvent: (event) => {
		const message = (event ?? {}) as WsEnvelope;
		if (!message.type) {
			return;
		}

		set((state) => {
			const nextRuns = new Map(state.runs);
			const now = Date.now();

			if (message.type === "runs" && Array.isArray(message.data)) {
				for (const run of message.data as RawRun[]) {
					if (!run?.runId) continue;
					nextRuns.set(run.runId, normalizeRun(run));
				}
				return { runs: nextRuns, lastEventAt: now };
			}

			if (message.type === "run.update" && message.data?.runId) {
				const incoming = normalizeRun(message.data as RawRun);
				const existing = nextRuns.get(incoming.runId);
				nextRuns.set(incoming.runId, {
					...existing,
					...incoming,
					tools: incoming.tools.length > 0 ? incoming.tools : existing?.tools ?? [],
				});
				return { runs: nextRuns, lastEventAt: now };
			}

			if (message.type === "activity" && message.data?.runId) {
				const activityRaw = message.data as RawActivity;
				const runId = activityRaw.runId as string;
				const activity = normalizeActivity(activityRaw);
				const existing =
					nextRuns.get(runId) ??
					({
						runId,
						taskPreview: "",
						status: "running",
						startedAt: activity.startedAt,
						lastAt: activity.startedAt,
						tools: [],
						currentPhase: activityRaw.phase ?? "working",
					} satisfies RunData);

				const tools = [...existing.tools];
				const idx = tools.findIndex((tool) => tool.id === activity.id);
				if (idx >= 0) {
					tools[idx] = activity;
				} else {
					tools.push(activity);
				}

				nextRuns.set(runId, {
					...existing,
					status: activity.status === "error" ? "error" : existing.status,
					lastAt: activity.startedAt,
					currentPhase: activityRaw.phase ?? existing.currentPhase,
					tools,
				});
				return { runs: nextRuns, lastEventAt: now };
			}

			return { runs: nextRuns, lastEventAt: now };
		});
	},
	setConnected: (value) => {
		set({ isConnected: value });
	},
	clearRuns: () => {
		set({ runs: new Map(), lastEventAt: null });
	},
}));
