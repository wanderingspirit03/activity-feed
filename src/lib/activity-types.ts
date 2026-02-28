export type RunPhase =
	| "queued"
	| "understanding"
	| "working"
	| "reviewing"
	| "complete"
	| "error";

export type ActivityItem = {
	id: string;
	runId: string;
	timestamp: number;
	phase: RunPhase;
	title: string;
	description?: string;
	icon?: string;
	progress?: number;
	isActive?: boolean;
	toolName?: string;
	toolArgs?: string;
};

export type RunOverview = {
	runId: string;
	task: string;
	phase: RunPhase;
	progress: number;
	startedAt: number;
	updatedAt: number;
	activities: ActivityItem[];
	specialist?: string;
};

export type WsMessage =
	| { type: "runs"; data: RunOverview[] }
	| { type: "run.update"; data: RunOverview }
	| { type: "activity"; data: ActivityItem }
	| { type: "ping" };

export type TelemetryEvent = {
	id: string;
	type: string;
	ts: number;
	runId?: string;
	actor?: string;
	messageType?: string;
	data?: Record<string, unknown>;
};
