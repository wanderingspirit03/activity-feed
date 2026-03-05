"use client";

import { useMemo } from "react";
import {
	CheckCircle2,
	Clock,
	Loader2,
	Rocket,
	Sparkles,
	Wrench,
	XCircle,
	AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useOpsStore, type OpsData, type OpsFeature, type OpsEvent, type OpsFeatureStatus } from "@/stores/ops-store";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/* ── Status helpers ────────────────────────────── */

const statusConfig: Record<string, { label: string; className: string }> = {
	running: { label: "Running", className: "border-blue-500/40 bg-blue-500/10 text-blue-400 animate-pulse" },
	completed: { label: "Complete", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
	failed: { label: "Failed", className: "border-red-500/40 bg-red-500/10 text-red-400" },
	planning: { label: "Planning", className: "border-amber-500/40 bg-amber-500/10 text-amber-400" },
	approved: { label: "Approved", className: "border-purple-500/40 bg-purple-500/10 text-purple-400" },
};

const featureStatusConfig: Record<OpsFeatureStatus, { label: string; className: string; icon: typeof Clock }> = {
	pending: { label: "Queued", className: "text-muted-foreground border-border", icon: Clock },
	"in-progress": { label: "Working", className: "text-amber-400 border-amber-500/40 bg-amber-500/10", icon: Loader2 },
	done: { label: "Done", className: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10", icon: CheckCircle2 },
	failed: { label: "Failed", className: "text-red-400 border-red-500/40 bg-red-500/10", icon: XCircle },
	"fix-needed": { label: "Needs update", className: "text-orange-400 border-orange-500/40 bg-orange-500/10", icon: AlertTriangle },
};

function eventEmoji(type: string, status?: string) {
	switch (type) {
		case "ops.started": return "🚀";
		case "ops.feature.dispatched": return "👷";
		case "ops.feature.completed": return status === "done" ? "✅" : status === "failed" ? "❌" : "⚠️";
		case "ops.phase.advanced": return "📊";
		case "ops.completed": return "🎉";
		case "ops.review": return "🔍";
		default: return "•";
	}
}

function eventLabel(event: OpsEvent) {
	switch (event.type) {
		case "ops.started": return "Operation started";
		case "ops.feature.dispatched": return `Worker assigned to "${event.title}"`;
		case "ops.feature.completed": return event.title;
		case "ops.phase.advanced": return event.title;
		case "ops.completed": return "Operation complete!";
		case "ops.review": return `Code review: ${event.verdict ?? event.title}`;
		default: return event.title;
	}
}

/* ── Feature Card ──────────────────────────────── */

function FeatureCard({ feature }: { feature: OpsFeature }) {
	const config = featureStatusConfig[feature.status] ?? featureStatusConfig.pending;
	const Icon = config.icon;
	const isWorking = feature.status === "in-progress";

	return (
		<div className={cn("rounded-lg border px-3 py-2.5 transition-colors", isWorking ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card/50")}>
			<div className="flex items-start gap-3">
				<div className="shrink-0 mt-0.5">
					<Icon className={cn("h-4 w-4", config.className.split(" ").find(c => c.startsWith("text-")), isWorking && "animate-spin")} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-2">
						<p className="text-sm font-medium text-foreground break-words">{feature.title}</p>
						<Badge variant="outline" className={cn("shrink-0 text-[10px] whitespace-nowrap", config.className)}>
							{config.label}
						</Badge>
					</div>
					<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
						<span className="text-[11px] text-muted-foreground">Step {feature.phase}</span>
						<span className="text-[11px] text-muted-foreground hidden sm:inline">·</span>
						<span className="text-[11px] text-muted-foreground truncate max-w-[180px] sm:max-w-none">{feature.assignedModel || "worker"}</span>
						{feature.attempts > 1 && (
							<>
								<span className="text-[11px] text-muted-foreground">·</span>
								<span className="text-[11px] text-muted-foreground">Attempt {feature.attempts}</span>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

/* ── Step Tracker ──────────────────────────────── */

function StepTracker({ currentPhase, totalPhases, status }: { currentPhase: number; totalPhases: number; status: string }) {
	const steps = Math.max(totalPhases, 3);
	const activeStep = status === "completed" ? steps + 1 : currentPhase;

	return (
		<div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
			{Array.from({ length: steps }, (_, i) => {
				const step = i + 1;
				const isActive = step === activeStep;
				const isDone = step < activeStep || status === "completed";
				return (
					<div key={step} className="flex items-center gap-1 flex-1 min-w-0">
						<div className={cn(
							"flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-medium shrink-0",
							isDone ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" :
							isActive ? "border-blue-500/50 bg-blue-500/15 text-blue-400 animate-pulse" :
							"border-border text-muted-foreground",
						)}>
							{isDone ? <CheckCircle2 className="h-3 w-3" /> : step}
						</div>
						{i < steps - 1 && (
							<div className={cn("h-[2px] flex-1 min-w-[12px] rounded-full", isDone ? "bg-emerald-500/40" : "bg-border")} />
						)}
					</div>
				);
			})}
		</div>
	);
}

/* ── Op Card ───────────────────────────────────── */

function OpCard({ op }: { op: OpsData }) {
	const doneCount = op.features.filter(f => f.status === "done").length;
	const failedCount = op.features.filter(f => f.status === "failed").length;
	const totalCount = op.features.length;
	const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
	const config = statusConfig[op.status] ?? statusConfig.planning;

	return (
		<Card className="overflow-hidden">
			<CardHeader className="pb-4 px-3 sm:px-6">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<CardTitle className="text-base sm:text-lg leading-snug break-words">{op.title}</CardTitle>
						<CardDescription className="mt-1 font-mono text-[11px] sm:text-xs truncate">{op.opId}</CardDescription>
					</div>
					<Badge variant="outline" className={cn("shrink-0 uppercase tracking-wider text-[10px]", config.className)}>
						{config.label}
					</Badge>
				</div>

				<div className="mt-3 sm:mt-4 rounded-lg border border-border bg-card/50 p-2 sm:p-3">
					<StepTracker currentPhase={op.currentPhase} totalPhases={op.totalPhases} status={op.status} />
				</div>

				<div className="mt-2 sm:mt-3 space-y-1.5">
					<div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
						<span>Progress</span>
						<span className="tabular-nums">
							{doneCount}/{totalCount} done
							{failedCount > 0 && <span className="text-red-400 ml-1">· {failedCount} failed</span>}
						</span>
					</div>
					<Progress value={progress} className="h-1.5 sm:h-2" />
				</div>
			</CardHeader>

			<CardContent className="space-y-1.5 pt-0 px-3 sm:px-6">
				{op.features.length === 0 ? (
					<p className="text-sm text-muted-foreground py-4 text-center">Workers are getting ready…</p>
				) : (
					op.features.map(feature => <FeatureCard key={feature.id} feature={feature} />)
				)}
			</CardContent>
		</Card>
	);
}

/* ── Timeline ──────────────────────────────────── */

function Timeline({ events }: { events: OpsEvent[] }) {
	const sorted = useMemo(() => [...events].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30), [events]);

	return (
		<Card>
			<CardHeader className="pb-3 px-3 sm:px-6">
				<CardTitle className="text-sm">Live Timeline</CardTitle>
			</CardHeader>
			<CardContent className="px-3 sm:px-6">
				<ScrollArea className="h-[280px] sm:h-[400px]">
					{sorted.length === 0 ? (
						<p className="text-xs text-muted-foreground py-8 text-center">Waiting for updates…</p>
					) : (
						<div className="space-y-2 pr-3">
							{sorted.map(event => (
								<div key={event.id} className="flex items-start justify-between gap-2 rounded-md border border-border bg-card/50 px-2 sm:px-2.5 py-1.5 sm:py-2">
									<div className="flex items-start gap-2 min-w-0">
										<span className="text-sm leading-none shrink-0">{eventEmoji(event.type, event.status)}</span>
										<p className="text-[11px] sm:text-xs text-foreground break-words">{eventLabel(event)}</p>
									</div>
									<span className="text-[10px] text-muted-foreground tabular-nums shrink-0 whitespace-nowrap">
										{formatDistanceToNow(event.timestamp, { addSuffix: true })}
									</span>
								</div>
							))}
						</div>
					)}
				</ScrollArea>
			</CardContent>
		</Card>
	);
}

/* ── Page ──────────────────────────────────────── */

export default function OpsPage() {
	const ops = useOpsStore((state: { ops: OpsData[] }) => state.ops);
	const latestOp = ops[0];

	return (
		<div className="space-y-4 sm:space-y-6 px-3 py-4 sm:px-4 md:px-8 sm:py-6 pb-24 md:pb-6">
			<header>
				<div className="flex items-center gap-2 sm:gap-3">
					<Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
					<h1 className="text-lg sm:text-xl font-semibold tracking-tight">Operations</h1>
					{latestOp && (
						<Badge variant="outline" className={cn("ml-auto text-[10px] sm:text-xs", (statusConfig[latestOp.status] ?? statusConfig.planning).className)}>
							{latestOp.status}
						</Badge>
					)}
				</div>
				<p className="mt-1 text-xs sm:text-sm text-muted-foreground">Live progress of autonomous code operations</p>
			</header>

			{ops.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
						<div className="mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-dashed border-border">
							<Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
						</div>
						<p className="text-sm text-foreground">No operations running</p>
						<p className="mt-1 text-xs text-muted-foreground">
							When an operation starts, live updates will appear here automatically.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="flex flex-col gap-4 lg:grid lg:grid-cols-3">
					<section className="space-y-4 lg:col-span-2">
						{ops.map((op: OpsData) => <OpCard key={op.opId} op={op} />)}
					</section>
					<aside className="lg:col-span-1">
						{latestOp && <Timeline events={latestOp.events} />}
					</aside>
				</div>
			)}
		</div>
	);
}
