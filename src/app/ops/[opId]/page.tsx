"use client";

import { formatDistanceToNow } from "date-fns";
import {
	AlertTriangle,
	ArrowLeft,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	Loader2,
	Rocket,
	Sparkles,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DependencyGraph } from "@/components/ops/DependencyGraph";
import FeatureCard from "@/components/ops/FeatureCard";
import InterventionPanel from "@/components/ops/InterventionPanel";
import OpActions from "@/components/ops/OpActions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOp } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { type OpsData, type OpsEvent, useOpsStore } from "@/stores/ops-store";

const opStatusConfig: Record<string, { label: string; className: string }> = {
	running: {
		label: "Running",
		className: "border-blue-500/40 bg-blue-500/10 text-blue-400 animate-pulse",
	},
	completed: {
		label: "Completed",
		className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
	},
	failed: {
		label: "Failed",
		className: "border-red-500/40 bg-red-500/10 text-red-400",
	},
	planning: {
		label: "Planning",
		className: "border-amber-500/40 bg-amber-500/10 text-amber-400",
	},
	approved: {
		label: "Approved",
		className: "border-purple-500/40 bg-purple-500/10 text-purple-400",
	},
	paused: {
		label: "Paused",
		className: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
	},
};

function eventEmoji(type: string, status?: string) {
	switch (type) {
		case "ops.started":
			return "🚀";
		case "ops.feature.dispatched":
			return "👷";
		case "ops.feature.completed":
			return status === "done" ? "✅" : status === "failed" ? "❌" : "⚠️";
		case "ops.phase.advanced":
			return "📊";
		case "ops.completed":
			return "🎉";
		case "ops.review":
			return "🔍";
		default:
			return "•";
	}
}

function eventLabel(event: OpsEvent) {
	switch (event.type) {
		case "ops.started":
			return "Operation started";
		case "ops.feature.dispatched":
			return `Worker assigned to "${event.title}"`;
		case "ops.feature.completed":
			return event.title;
		case "ops.phase.advanced":
			return event.title;
		case "ops.completed":
			return "Operation complete";
		case "ops.review":
			return `Code review: ${event.verdict ?? event.title}`;
		default:
			return event.title;
	}
}

function useNow(tickMs = 1_000) {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), tickMs);
		return () => clearInterval(timer);
	}, [tickMs]);

	return now;
}

function formatElapsed(ms: number) {
	if (!Number.isFinite(ms) || ms <= 0) return "—";
	const totalSeconds = Math.floor(ms / 1_000);
	const hours = Math.floor(totalSeconds / 3_600);
	const minutes = Math.floor((totalSeconds % 3_600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}

function StepTracker({
	currentPhase,
	totalPhases,
	status,
}: {
	currentPhase: number;
	totalPhases: number;
	status: string;
}) {
	const steps = Math.max(totalPhases, 1);
	const activeStep = status === "completed" ? steps + 1 : Math.max(currentPhase, 1);

	return (
		<div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
			{Array.from({ length: steps }, (_, i) => {
				const step = i + 1;
				const isActive = step === activeStep;
				const isDone = step < activeStep || status === "completed";

				return (
					<div key={step} className="flex min-w-0 flex-1 items-center gap-1">
						<div
							className={cn(
								"flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium",
								isDone
									? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
									: isActive
										? "border-blue-500/50 bg-blue-500/15 text-blue-400 animate-pulse"
										: "border-border text-muted-foreground",
							)}
						>
							{isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : step}
						</div>
						{i < steps - 1 && (
							<div
								className={cn("h-[2px] min-w-[12px] flex-1 rounded-full", isDone ? "bg-emerald-500/40" : "bg-border")}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

function EventTimeline({ events }: { events: OpsEvent[] }) {
	const sorted = useMemo(() => [...events].sort((a, b) => b.timestamp - a.timestamp), [events]);

	return (
		<Card>
			<CardHeader className="px-4 pb-3 sm:px-6">
				<CardTitle className="text-base">Event Timeline</CardTitle>
				<CardDescription>Live operation events from the websocket stream</CardDescription>
			</CardHeader>
			<CardContent className="px-4 sm:px-6">
				<ScrollArea className="h-[300px] lg:h-[560px]">
					{sorted.length === 0 ? (
						<p className="py-8 text-center text-xs text-muted-foreground">No events yet…</p>
					) : (
						<div className="space-y-2 pr-3">
							{sorted.map((event) => (
								<div
									key={event.id}
									className="flex items-start justify-between gap-2 rounded-md border border-border bg-card/50 px-2.5 py-2"
								>
									<div className="flex min-w-0 items-start gap-2">
										<span className="shrink-0 text-sm leading-none">{eventEmoji(event.type, event.status)}</span>
										<p className="break-words text-xs text-foreground">{eventLabel(event)}</p>
									</div>
									<span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
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

export default function OpDetailPage() {
	const params = useParams<{ opId: string }>();
	const opId = params?.opId ?? "";

	const { data, error, isLoading } = useOp(opId);
	const addOrUpdateOp = useOpsStore((state) => state.addOrUpdateOp);
	const liveOp = useOpsStore((state) => state.ops.find((op) => op.opId === opId));

	const fetchedOp = (data as { op?: OpsData } | undefined)?.op;

	useEffect(() => {
		if (fetchedOp?.opId) {
			addOrUpdateOp(fetchedOp);
		}
	}, [fetchedOp, addOrUpdateOp]);

	const op = liveOp ?? fetchedOp;
	const now = useNow(1_000);

	const status = op?.status ?? "planning";
	const statusBadge = opStatusConfig[status] ?? {
		label: status || "Unknown",
		className: "border-border bg-muted/10 text-muted-foreground",
	};

	const doneCount = op?.features?.filter((feature) => feature.status === "done").length ?? 0;
	const failedCount = op?.features?.filter((feature) => feature.status === "failed").length ?? 0;
	const totalCount = op?.features?.length ?? 0;
	const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

	const elapsedMs = op ? (op.status === "completed" || op.status === "failed" ? op.updatedAt : now) - op.startedAt : 0;

	const groupedFeatures = useMemo(() => {
		if (!op) return [] as Array<{ phase: number; features: OpsData["features"] }>;
		const map = new Map<number, OpsData["features"]>();

		for (const feature of op.features) {
			const phase = Number(feature.phase) || 0;
			const existing = map.get(phase) ?? [];
			existing.push(feature);
			map.set(phase, existing);
		}

		return [...map.entries()]
			.sort((a, b) => a[0] - b[0])
			.map(([phase, features]) => ({
				phase,
				features: [...features].sort((a, b) => a.title.localeCompare(b.title)),
			}));
	}, [op]);

	const [collapsedPhases, setCollapsedPhases] = useState<Record<number, boolean>>({});

	useEffect(() => {
		if (!op) return;
		setCollapsedPhases((prev) => {
			const next = { ...prev };
			for (const group of groupedFeatures) {
				if (!(group.phase in next)) {
					next[group.phase] = false;
				}
			}
			return next;
		});
	}, [op, groupedFeatures]);

	if (!opId) {
		return (
			<div className="space-y-4 px-3 py-4 sm:px-4 md:px-8 sm:py-6">
				<Link
					href="/ops"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to operations
				</Link>
				<Card>
					<CardContent className="flex items-center gap-2 py-6 text-sm text-red-400">
						<AlertTriangle className="h-4 w-4" />
						Missing operation ID.
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-4 bg-background px-3 py-4 pb-24 sm:space-y-6 sm:px-4 sm:py-6 md:px-8 md:pb-8">
			<header className="space-y-3">
				<Link
					href="/ops"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to operations
				</Link>

				<Card>
					<CardHeader className="px-4 pb-4 sm:px-6">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="min-w-0">
								<CardTitle className="text-lg leading-tight sm:text-2xl">{op?.title || "Loading operation…"}</CardTitle>
								<CardDescription className="mt-1 break-all font-mono text-xs">{opId}</CardDescription>
							</div>
							<Badge variant="outline" className={cn("uppercase tracking-wide", statusBadge.className)}>
								{statusBadge.label}
							</Badge>
						</div>

						<div className="mt-4 rounded-lg border border-border bg-card/50 p-3">
							<StepTracker currentPhase={op?.currentPhase ?? 0} totalPhases={op?.totalPhases ?? 1} status={status} />
						</div>

						<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
							<div className="rounded-md border border-border/60 bg-background/40 p-3">
								<p className="text-[10px] uppercase tracking-wide text-muted-foreground">Progress</p>
								<div className="mt-2 space-y-1.5">
									<div className="flex items-center justify-between text-xs text-muted-foreground">
										<span>
											{doneCount}/{totalCount} done
										</span>
										{failedCount > 0 && <span className="text-red-400">{failedCount} failed</span>}
									</div>
									<Progress value={progress} className="h-2" />
								</div>
							</div>

							<div className="rounded-md border border-border/60 bg-background/40 p-3">
								<p className="text-[10px] uppercase tracking-wide text-muted-foreground">Elapsed</p>
								<p className="mt-2 text-lg font-semibold tabular-nums">{formatElapsed(elapsedMs)}</p>
							</div>

							<div className="rounded-md border border-border/60 bg-background/40 p-3">
								<p className="text-[10px] uppercase tracking-wide text-muted-foreground">Updated</p>
								<p className="mt-2 text-sm text-foreground">
									{op?.updatedAt ? formatDistanceToNow(op.updatedAt, { addSuffix: true }) : "—"}
								</p>
							</div>
						</div>
					</CardHeader>
				</Card>
			</header>

			{error && !op && (
				<Card>
					<CardContent className="flex items-center gap-2 py-5 text-sm text-red-400">
						<XCircle className="h-4 w-4" />
						Failed to load operation details.
					</CardContent>
				</Card>
			)}

			{isLoading && !op && (
				<Card>
					<CardContent className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Loading operation details…
					</CardContent>
				</Card>
			)}

			{!isLoading && !error && !op && (
				<Card>
					<CardContent className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
						<Clock className="h-4 w-4" />
						Operation not found.
					</CardContent>
				</Card>
			)}

			{op && (
				<div className="flex flex-col gap-4 lg:grid lg:grid-cols-3">
					<section className="space-y-4 lg:col-span-2">
						{groupedFeatures.length === 0 ? (
							<Card>
								<CardContent className="flex flex-col items-center justify-center py-12 text-center">
									<div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-border">
										<Sparkles className="h-5 w-5 text-muted-foreground" />
									</div>
									<p className="text-sm text-foreground">No features yet</p>
									<p className="mt-1 text-xs text-muted-foreground">
										This operation has not dispatched feature workers.
									</p>
								</CardContent>
							</Card>
						) : (
							groupedFeatures.map((group) => {
								const isCollapsed = collapsedPhases[group.phase] ?? false;
								const completed = group.features.filter((feature) => feature.status === "done").length;
								const total = group.features.length;

								return (
									<Card key={group.phase}>
										<CardHeader className="px-4 pb-3 sm:px-6">
											<button
												type="button"
												onClick={() =>
													setCollapsedPhases((prev) => ({
														...prev,
														[group.phase]: !prev[group.phase],
													}))
												}
												className="flex w-full items-center justify-between text-left"
											>
												<div className="flex min-w-0 items-center gap-2">
													<Rocket className="h-4 w-4 shrink-0 text-muted-foreground" />
													<div>
														<CardTitle className="text-base">Phase {group.phase}</CardTitle>
														<CardDescription className="mt-1 text-xs">
															{completed}/{total} complete
														</CardDescription>
													</div>
												</div>
												<div className="text-muted-foreground">
													{isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
												</div>
											</button>
										</CardHeader>

										{!isCollapsed && (
											<CardContent className="space-y-2 px-4 pt-0 sm:px-6">
												{group.features.map((feature) => (
													<FeatureCard key={feature.id} feature={feature} />
												))}
											</CardContent>
										)}
									</Card>
								);
							})
						)}
					</section>

					<aside className="lg:col-span-1">
						<EventTimeline events={op.events} />
					</aside>

					{/* Dependency Graph */}
					{op.features.length > 0 && (
						<div className="lg:col-span-3">
							<Card>
								<CardHeader className="px-4 pb-3 sm:px-6">
									<CardTitle className="text-base">Feature Map</CardTitle>
									<CardDescription className="text-xs">Features grouped by phase</CardDescription>
								</CardHeader>
								<CardContent className="px-4 sm:px-6">
									<DependencyGraph features={op.features} />
								</CardContent>
							</Card>
						</div>
					)}

					{/* Intervention Panel */}
					<div className="lg:col-span-3">
						<InterventionPanel opId={opId as string} status={status} />
					</div>
				</div>
			)}
		</div>
	);
}
