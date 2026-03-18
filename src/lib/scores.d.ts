export type ScoreEntry = {
	timestamp: string;
	task: string;
	status: string;
	scores: {
		quality: number;
		efficiency: number;
		toolSelection: number;
		communication: number;
		reasoning?: string;
	};
	stats?: {
		toolCalls?: number;
		toolErrors?: number;
		durationMs?: number;
	};
};
export type ImprovementBaseline = {
	recordedAt: string;
	taskCount: number;
	avgQuality: number;
	avgEfficiency: number;
	avgToolSelection: number;
	avgCommunication: number;
	semanticMemoryEntries?: number;
};
export type ImprovementCheckpoint = ImprovementBaseline & {
	delta: {
		quality: number;
		efficiency: number;
		toolSelection: number;
		communication: number;
		semanticMemory?: number;
	};
};
export type ImprovementTargets = {
	avgEfficiency: number;
	avgToolSelection: number;
	semanticMemoryEntries?: number;
	toolErrorRate: number;
	bashReadRatio: number;
};
export type ImprovementImpact = {
	baseline: ImprovementBaseline;
	targets: ImprovementTargets;
	checkpoints: ImprovementCheckpoint[];
	improvements: unknown[];
};
export type ScoresPayload = {
	entries: ScoreEntry[];
	totals: {
		count: number;
		avgQuality: number;
		avgEfficiency: number;
		avgToolSelection: number;
		avgCommunication: number;
		errorRate: number;
	};
	recent30: {
		avgQuality: number;
		avgEfficiency: number;
		avgToolSelection: number;
		avgCommunication: number;
	};
	recent10: {
		avgQuality: number;
		avgEfficiency: number;
		avgToolSelection: number;
		avgCommunication: number;
	};
	daily: Array<{
		date: string;
		count: number;
		avgQuality: number;
		avgEfficiency: number;
		avgToolSelection: number;
		avgCommunication: number;
	}>;
	impact: ImprovementImpact | null;
	worstTasks: ScoreEntry[];
};
export declare function getScores(): Promise<ScoresPayload>;
//# sourceMappingURL=scores.d.ts.map
