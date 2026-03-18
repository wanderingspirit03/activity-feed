import type { ActorEntry, DlqEntry, FullTraceDetail, RunDetail, RunSummary } from "@/lib/types";
export declare function getRuns(options: {
	limit?: number;
	cursor?: number;
	status?: string;
	tag?: string;
	q?: string;
	namespace?: string;
}): Promise<{
	runs: RunSummary[];
	nextCursor?: number;
}>;
export declare function getRunDetail(runId: string, limit?: number): Promise<RunDetail>;
export declare function getRunFullTrace(runId: string): Promise<FullTraceDetail>;
export declare function getActors(): Promise<ActorEntry[]>;
export declare function getDlq(limit?: number): Promise<DlqEntry[]>;
//# sourceMappingURL=telemetry.d.ts.map
