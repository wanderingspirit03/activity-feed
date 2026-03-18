import { ActivityItem, RunPhase } from "./types.js";
export type RawTelemetryEvent = {
	id: string;
	runId: string;
	timestamp: string;
	type: string;
	task?: string;
	tool?: string;
	subagent?: string;
	status?: string;
	message?: string;
};
export declare function getPhaseForEvent(eventType: string, currentPhase?: RunPhase): RunPhase;
export declare function translateEventToActivity(event: RawTelemetryEvent): ActivityItem;
export declare function determineSpecialist(task: string): string;
//# sourceMappingURL=telemetry-bridge.d.ts.map
