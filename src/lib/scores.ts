import { promises as fs } from "node:fs";
import path from "node:path";

import { getRedis } from "@/lib/redis";

/* ── Types ─────────────────────────────────────────────── */

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

/* ── Helpers ───────────────────────────────────────────── */

function avg(nums: number[]): number {
	if (nums.length === 0) return 0;
	return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function sliceAvg(entries: ScoreEntry[], count: number) {
	const slice = entries.slice(-count);
	return {
		avgQuality: avg(slice.map((e) => e.scores.quality)),
		avgEfficiency: avg(slice.map((e) => e.scores.efficiency)),
		avgToolSelection: avg(slice.map((e) => e.scores.toolSelection)),
		avgCommunication: avg(slice.map((e) => e.scores.communication)),
	};
}

/* ── Data Loading ──────────────────────────────────────── */

const SCORES_KEY = "actor:scores:entries";
const SCORES_DIR = path.resolve(process.cwd(), "../memory/scores");

async function readJsonSafe<T>(filePath: string): Promise<T | null> {
	try {
		const raw = await fs.readFile(filePath, "utf-8");
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

async function getScoresFromRedis(): Promise<ScoreEntry[] | null> {
	try {
		const redis = getRedis();
		const members = await redis.zrange(SCORES_KEY, 0, -1);
		if (!members || members.length === 0) return null;
		const entries: ScoreEntry[] = [];
		for (const m of members) {
			try {
				entries.push(JSON.parse(m));
			} catch {}
		}
		return entries.length > 0 ? entries : null;
	} catch {
		return null;
	}
}

export async function getScores(): Promise<ScoresPayload> {
	// Try Redis first (for Vercel/production), fall back to filesystem (local dev)
	let entries: ScoreEntry[];
	const redisEntries = await getScoresFromRedis();
	if (redisEntries && redisEntries.length > 0) {
		entries = redisEntries;
	} else {
		const scoresData = await readJsonSafe<{ entries: ScoreEntry[] }>(
			path.join(SCORES_DIR, "task-scores.json"),
		);
		entries = scoresData?.entries ?? [];
	}

	const impactData = await readJsonSafe<ImprovementImpact>(
		path.join(SCORES_DIR, "improvement-impact.json"),
	);

	const scored = entries.filter((e) => e.scores);

	// Totals
	const totalToolCalls = scored.reduce((sum, e) => sum + (e.stats?.toolCalls ?? 0), 0);
	const totalToolErrors = scored.reduce((sum, e) => sum + (e.stats?.toolErrors ?? 0), 0);

	const totals = {
		count: scored.length,
		...sliceAvg(scored, scored.length),
		errorRate: totalToolCalls > 0 ? Math.round((totalToolErrors / totalToolCalls) * 1000) / 10 : 0,
	};

	// Daily breakdown
	const byDay = new Map<string, ScoreEntry[]>();
	for (const entry of scored) {
		const date = entry.timestamp.slice(0, 10);
		const existing = byDay.get(date) ?? [];
		existing.push(entry);
		byDay.set(date, existing);
	}
	const daily = Array.from(byDay.entries())
		.map(([date, dayEntries]) => ({
			date,
			count: dayEntries.length,
			...sliceAvg(dayEntries, dayEntries.length),
		}))
		.sort((a, b) => a.date.localeCompare(b.date));

	// Worst tasks
	const worstTasks = [...scored]
		.sort((a, b) => a.scores.quality - b.scores.quality)
		.slice(0, 10);

	return {
		entries: scored,
		totals,
		recent30: sliceAvg(scored, 30),
		recent10: sliceAvg(scored, 10),
		daily,
		impact: impactData,
		worstTasks,
	};
}
