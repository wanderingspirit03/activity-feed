export type OpsFeatureStatus = "pending" | "in-progress" | "done" | "failed" | "fix-needed";
export type ToolActivity = {
	id: string;
	toolName: string;
	toolArgs: string;
	status: "running" | "success" | "error";
	startedAt: number;
	completedAt?: number;
};
export type OpsFeature = {
	id: string;
	title: string;
	status: OpsFeatureStatus;
	phase: number;
	assignedModel: string;
	attempts: number;
	toolActivity?: ToolActivity[];
};
export type OpsEvent = {
	id: string;
	timestamp: number;
	type: string;
	title: string;
	featureId?: string;
	status?: OpsFeatureStatus;
	verdict?: string;
};
export type OpsData = {
	opId: string;
	title: string;
	status: string;
	features: OpsFeature[];
	currentPhase: number;
	totalPhases: number;
	startedAt: number;
	updatedAt: number;
	events: OpsEvent[];
};
type OpsStore = {
	ops: OpsData[];
	addOrUpdateOp: (op: OpsData) => void;
	processEvent: (envelope: any) => void;
};
export declare const useOpsStore: import("zustand").UseBoundStore<import("zustand").StoreApi<OpsStore>>;
//# sourceMappingURL=ops-store.d.ts.map
