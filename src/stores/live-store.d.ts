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
type LiveStore = {
	runs: Map<string, RunData>;
	isConnected: boolean;
	lastEventAt: number | null;
	addEvent: (event: unknown) => void;
	setConnected: (value: boolean) => void;
	clearRuns: () => void;
};
export declare const useLiveStore: import("zustand").UseBoundStore<import("zustand").StoreApi<LiveStore>>;
//# sourceMappingURL=live-store.d.ts.map
