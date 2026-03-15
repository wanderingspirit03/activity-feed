import { apiFetch } from "@/lib/api-client";

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

type ApiScoreEntry = {
  id: number;
  timestamp: string;
  task: string;
  status: string;
  quality: number;
  efficiency: number;
  tool_selection: number;
  communication: number;
  reasoning?: string;
};

/* ── Data Loading ──────────────────────────────────────── */

export async function getScores(): Promise<ScoresPayload> {
  try {
    const data = await apiFetch<{ entries: ApiScoreEntry[] }>("/api/scores?limit=500");

    const entries: ScoreEntry[] = (data.entries || []).map((e) => ({
      timestamp: e.timestamp,
      task: e.task,
      status: e.status,
      scores: {
        quality: e.quality,
        efficiency: e.efficiency,
        toolSelection: e.tool_selection,
        communication: e.communication,
        reasoning: e.reasoning,
      },
    }));

    const scored = entries.filter((e) => e.scores);

    const totalToolCalls = 0;
    const totalToolErrors = 0;

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

    const worstTasks = [...scored]
      .sort((a, b) => a.scores.quality - b.scores.quality)
      .slice(0, 10);

    return {
      entries: scored,
      totals,
      recent30: sliceAvg(scored, 30),
      recent10: sliceAvg(scored, 10),
      daily,
      impact: null,
      worstTasks,
    };
  } catch {
    return {
      entries: [],
      totals: { count: 0, avgQuality: 0, avgEfficiency: 0, avgToolSelection: 0, avgCommunication: 0, errorRate: 0 },
      recent30: { avgQuality: 0, avgEfficiency: 0, avgToolSelection: 0, avgCommunication: 0 },
      recent10: { avgQuality: 0, avgEfficiency: 0, avgToolSelection: 0, avgCommunication: 0 },
      daily: [],
      impact: null,
      worstTasks: [],
    };
  }
}
