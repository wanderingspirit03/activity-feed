"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
	Activity,
	AlertTriangle,
	Brain,
	ChevronDown,
	Clock3,
	MessageCircle,
	Play,
	Users,
	Wifi,
	WifiOff,
	Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLiveStore, type RunData, type ActivityItem } from "@/stores/live-store";

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
	const duration = item.completedAt
		? formatDuration(item.completedAt - item.startedAt)
		: null;
	const hasDetails = !!(item.toolArgs || item.result);

	return (
		<button
			type="button"
			onClick={() => hasDetails && setExpanded(!expanded)}
			className={`w-full text-left rounded-lg border px-2.5 py-2 sm:px-3 transition-colors ${
				isLatest && isRunning
					? "border-blue-500/50 bg-blue-500/5"
					: "border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900"
			} ${hasDetails ? "cursor-pointer" : "cursor-default"}`}
		>
			{/* Collapsed row — always visible */}
			<div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
				<EventIcon kind={item.eventKind} className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
				{item.toolName && (
					<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700 whitespace-nowrap shrink-0">
						{item.toolName}
					</span>
				)}
				<span className="font-mono text-xs sm:text-sm text-neutral-400 truncate min-w-0 flex-1">
					{item.title || "tool call"}
				</span>
				<span className="shrink-0 flex items-center gap-1.5 sm:gap-2">
					{duration && (
						<span className="text-[10px] sm:text-xs text-neutral-500 tabular-nums">{duration}</span>
					)}
					{hasDetails && (
						<ChevronDown className={`h-3 w-3 text-neutral-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
					)}
					{isRunning ? (
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
						</span>
					) : item.status === "error" ? (
						<Badge variant="destructive" className="text-[10px] px-1.5 py-0">err</Badge>
					) : (
						<span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
					)}
				</span>
			</div>

			{/* Expanded details — only on click */}
			{expanded && (
				<div className="mt-2 space-y-1.5">
					{item.toolArgs && (
						<div className="rounded bg-neutral-950 border border-neutral-800 p-2 overflow-x-auto max-h-48 overflow-y-auto">
							<pre className="text-[10px] sm:text-xs font-mono text-neutral-400 whitespace-pre-wrap break-all">
								{item.toolArgs}
							</pre>
						</div>
					)}
					{item.result && (
						<div className="rounded bg-neutral-950 border border-neutral-800 p-2 overflow-x-auto max-h-48 overflow-y-auto">
							<pre className="text-[10px] sm:text-xs font-mono text-emerald-400/70 whitespace-pre-wrap break-all">
								{item.result.slice(0, 2000)}
							</pre>
						</div>
					)}
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
			<CardHeader className="px-3 sm:px-6 pb-3 border-b border-neutral-800">
				<div className="flex items-start justify-between gap-2 min-w-0">
					<div className="min-w-0 flex-1">
						<CardTitle className="text-sm sm:text-base font-medium truncate">
							{run.taskPreview || run.runId}
						</CardTitle>
						<div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 text-[10px] sm:text-xs text-neutral-500">
							<span>{formatTime(run.startedAt)}</span>
							<span>·</span>
							<span>{elapsed(run.startedAt)}</span>
							<span>·</span>
							<span>{tools.length} tools</span>
						</div>
					</div>
					<Badge
						variant={isActive ? "default" : "secondary"}
						className={`shrink-0 text-[10px] sm:text-xs ${isActive ? "bg-blue-600" : ""}`}
					>
						{run.status || "unknown"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="px-3 sm:px-6 pt-3 space-y-1.5">
				{tools.length === 0 ? (
					<p className="text-xs sm:text-sm text-neutral-500 italic">Waiting for tool calls...</p>
				) : (
					tools.slice(-30).map((item, i, sliced) => (
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

	return (
		<div className="space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-8 py-4 sm:py-6 max-w-4xl mx-auto">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<div>
					<h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Live</h1>
					<p className="text-xs sm:text-sm text-neutral-500 mt-0.5 sm:mt-1">
						Real-time activity stream
					</p>
				</div>
				<div className="flex items-center gap-2 self-start">
					{isConnected ? (
						<>
							<Wifi className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
							<span className="text-[10px] sm:text-xs text-emerald-500">Connected</span>
						</>
					) : (
						<>
							<WifiOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-400" />
							<span className="text-[10px] sm:text-xs text-red-400">Disconnected</span>
						</>
					)}
					<button
						onClick={() => {
							setPaused(!paused);
							if (paused) setBufferedCount(0);
						}}
						className={`px-2 py-1 sm:px-2.5 rounded text-[10px] sm:text-xs font-medium transition-colors ${
							paused
								? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
								: "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
						}`}
					>
						{paused ? `▶ Resume (${bufferedCount})` : "⏸ Pause"}
					</button>
				</div>
			</div>

			{/* Stats bar */}
			<div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-neutral-400">
				<span className="rounded border border-neutral-800 bg-neutral-900 px-2 py-0.5 sm:py-1">
					{activeRuns.length} active
				</span>
				<span className="rounded border border-neutral-800 bg-neutral-900 px-2 py-0.5 sm:py-1">
					{runArray.length} total
				</span>
			</div>

			{/* Active runs */}
			{activeRuns.length > 0 && (
				<div className="space-y-3 sm:space-y-4">
					<h2 className="text-xs sm:text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
						<Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Active ({activeRuns.length})
					</h2>
					{activeRuns.map((run) => (
						<RunSection key={run.runId} run={run} />
					))}
				</div>
			)}

			{/* Recent runs */}
			{recentRuns.length > 0 && (
				<div className="space-y-3 sm:space-y-4">
					<h2 className="text-xs sm:text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
						<Clock3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Recent
					</h2>
					{recentRuns.slice(0, 10).map((run) => (
						<RunSection key={run.runId} run={run} />
					))}
				</div>
			)}

			{/* Empty state */}
			{runArray.length === 0 && (
				<Card className="border-neutral-800 bg-neutral-950">
					<CardContent className="py-12 sm:py-16 text-center">
						<Activity className="h-8 w-8 sm:h-10 sm:w-10 text-neutral-600 mx-auto mb-3" />
						<p className="text-sm text-neutral-500">No active runs</p>
						<p className="text-[10px] sm:text-xs text-neutral-600 mt-1">
							Activity will appear here when tasks start
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
