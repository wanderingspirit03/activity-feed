"use client";

import {
	Activity,
	AlertTriangle,
	Brain,
	Clock3,
	MessageCircle,
	Play,
	Users,
	Wifi,
	WifiOff,
	Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ActivityItem, type RunData, useLiveStore } from "@/stores/live-store";

function formatTime(ts: number) {
	const d = new Date(ts);
	return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDuration(ms: number) {
	if (ms < 1000) return `${ms}ms`;
	const s = ms / 1000;
	if (s < 60) return `${s.toFixed(1)}s`;
	const m = Math.floor(s / 60);
	const rs = Math.floor(s % 60);
	return `${m}m ${rs}s`;
}

function elapsed(startedAt: number) {
	return formatDuration(Date.now() - startedAt);
}

const activeStatuses = new Set(["working", "running", "queued", "understanding", "reviewing"]);

function EventIcon({ kind, className }: { kind: string; className?: string }) {
	switch (kind) {
		case "llm":
			return <Brain className={className} />;
		case "subagent":
			return <Users className={className} />;
		case "run":
			return <Play className={className} />;
		case "human":
			return <MessageCircle className={className} />;
		case "error":
			return <AlertTriangle className={className} />;
		case "tool":
		default:
			return <Wrench className={className} />;
	}
}

function ToolCard({ item, isLatest }: { item: ActivityItem; isLatest: boolean }) {
	const [expanded, setExpanded] = useState(false);
	const isRunning = item.status === "running";
	const duration = item.completedAt ? formatDuration(item.completedAt - item.startedAt) : null;

	return (
		<button
			type="button"
			onClick={() => setExpanded(!expanded)}
			className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
				isLatest && isRunning
					? "border-blue-500/50 bg-blue-500/5"
					: "border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900"
			}`}
		>
			<div className="flex items-center gap-2 min-w-0">
				<EventIcon kind={item.eventKind} className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
				<span className="font-mono text-sm text-neutral-300 shrink-0">{item.title || item.toolName || "tool"}</span>
				{!expanded && item.toolArgs && item.toolArgs !== item.title && (
					<span className="text-xs text-neutral-500 truncate min-w-0">{item.toolArgs.slice(0, 80)}</span>
				)}
				<span className="ml-auto shrink-0 flex items-center gap-2">
					{duration && <span className="text-xs text-neutral-500">{duration}</span>}
					{isRunning ? (
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
						</span>
					) : item.status === "error" ? (
						<Badge variant="destructive" className="text-[10px] px-1.5 py-0">
							error
						</Badge>
					) : (
						<span className="h-2 w-2 rounded-full bg-emerald-500" />
					)}
				</span>
			</div>

			{expanded && item.toolArgs && (
				<div className="mt-2 rounded bg-neutral-950 border border-neutral-800 p-2 overflow-x-auto max-h-48 overflow-y-auto">
					<pre className="text-xs font-mono text-neutral-400 whitespace-pre-wrap break-all">{item.toolArgs}</pre>
				</div>
			)}
			{expanded && item.result && (
				<div className="mt-1 rounded bg-neutral-950 border border-neutral-800 p-2 overflow-x-auto max-h-48 overflow-y-auto">
					<pre className="text-xs font-mono text-emerald-400/70 whitespace-pre-wrap break-all">
						{item.result.slice(0, 2000)}
					</pre>
				</div>
			)}
		</button>
	);
}

function RunSection({ run }: { run: RunData }) {
	const tools = run.tools || [];
	const isActive = activeStatuses.has(run.status);

	return (
		<Card className="border-neutral-800 bg-neutral-950">
			<CardHeader className="pb-3 border-b border-neutral-800">
				<div className="flex items-start justify-between gap-2 min-w-0">
					<div className="min-w-0 flex-1">
						<CardTitle className="text-base font-medium truncate">{run.taskPreview || run.runId}</CardTitle>
						<div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-neutral-500">
							<span>{formatTime(run.startedAt)}</span>
							<span>·</span>
							<span>{elapsed(run.startedAt)}</span>
							<span>·</span>
							<span>{tools.length} tools</span>
						</div>
					</div>
					<Badge variant={isActive ? "default" : "secondary"} className={`shrink-0 ${isActive ? "bg-blue-600" : ""}`}>
						{run.status || "unknown"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="pt-3 space-y-1.5">
				{tools.length === 0 ? (
					<p className="text-sm text-neutral-500 italic">Waiting for tool calls...</p>
				) : (
					tools
						.slice(-20)
						.map((item, i, sliced) => (
							<ToolCard
								key={item.id || `${run.runId}-${i}`}
								item={item}
								isLatest={i === sliced.length - 1 && isActive}
							/>
						))
				)}
			</CardContent>
		</Card>
	);
}

export default function LivePage() {
	const runs = useLiveStore((s) => s.runs);
	const isConnected = useLiveStore((s) => s.isConnected);
	const [paused, setPaused] = useState(false);
	const [bufferedCount, setBufferedCount] = useState(0);
	const [displayRuns, setDisplayRuns] = useState(() => new Map(runs));
	const lastRunsRef = useRef(runs);

	// Force re-render every 5s for elapsed times
	const [, setTick] = useState(0);
	useEffect(() => {
		const iv = setInterval(() => setTick((t) => t + 1), 5000);
		return () => clearInterval(iv);
	}, []);

	useEffect(() => {
		if (paused) {
			if (lastRunsRef.current !== runs) {
				setBufferedCount((count) => count + 1);
				lastRunsRef.current = runs;
			}
			return;
		}

		setDisplayRuns(new Map(runs));
		setBufferedCount(0);
		lastRunsRef.current = runs;
	}, [paused, runs]);

	const runArray = useMemo(() => {
		const arr = Array.from(displayRuns.values());
		arr.sort((a, b) => b.startedAt - a.startedAt);
		return arr;
	}, [displayRuns]);

	const activeRuns = runArray.filter((r) => activeStatuses.has(r.status));
	const recentRuns = runArray.filter((r) => !activeStatuses.has(r.status));
	const activePhaseCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const run of runArray) {
			const phase = (run.currentPhase || run.status || "unknown").toLowerCase();
			if (!activeStatuses.has(phase)) continue;
			counts.set(phase, (counts.get(phase) ?? 0) + 1);
		}
		return Array.from(counts.entries());
	}, [runArray]);
	const activePhaseCount = activePhaseCounts.reduce((sum, [, count]) => sum + count, 0);

	return (
		<div className="space-y-6 px-4 md:px-8 py-6 max-w-4xl">
			{/* Header */}
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Live</h1>
					<p className="text-sm text-neutral-500 mt-1">Real-time assistant activity stream.</p>
					<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
						<span className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1">
							{activeRuns.length} active runs
						</span>
						<span className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1">
							{activePhaseCount} active phases
						</span>
						{activePhaseCounts.map(([phase, count]) => (
							<span key={phase} className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 capitalize">
								{phase}: {count}
							</span>
						))}
					</div>
				</div>
				<div className="flex items-center gap-2">
					{isConnected ? (
						<>
							<Wifi className="h-4 w-4 text-emerald-500" />
							<span className="text-xs text-emerald-500">Connected</span>
						</>
					) : (
						<>
							<WifiOff className="h-4 w-4 text-red-400" />
							<span className="text-xs text-red-400">Disconnected</span>
						</>
					)}
					<button
						onClick={() => {
							setPaused(!paused);
							if (paused) setBufferedCount(0);
						}}
						className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
							paused
								? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
								: "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
						}`}
					>
						{paused ? `▶ Resume (${bufferedCount} new)` : "⏸ Pause"}
					</button>
				</div>
			</div>

			{/* Active runs */}
			{activeRuns.length > 0 && (
				<div className="space-y-4">
					<h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
						<Activity className="h-4 w-4" /> Active ({activeRuns.length})
					</h2>
					{activeRuns.map((run) => (
						<RunSection key={run.runId} run={run} />
					))}
				</div>
			)}

			{/* Recent runs */}
			{recentRuns.length > 0 && (
				<div className="space-y-4">
					<h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
						<Clock3 className="h-4 w-4" /> Recent
					</h2>
					{recentRuns.slice(0, 10).map((run) => (
						<RunSection key={run.runId} run={run} />
					))}
				</div>
			)}

			{/* Empty state */}
			{runArray.length === 0 && (
				<Card className="border-neutral-800 bg-neutral-950">
					<CardContent className="py-16 text-center">
						<Activity className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
						<p className="text-neutral-500">No active runs.</p>
						<p className="text-xs text-neutral-600 mt-1">Activity will appear here when tasks start.</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
