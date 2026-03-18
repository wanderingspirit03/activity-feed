"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock, Loader2, Wrench, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OpsFeature, OpsFeatureStatus } from "@/stores/ops-store";

type FeatureCardProps = {
	feature: OpsFeature;
	className?: string;
};

const statusConfig: Record<
	OpsFeatureStatus,
	{
		label: string;
		icon: typeof Clock;
		badgeClass: string;
		iconClass: string;
	}
> = {
	pending: {
		label: "Queued",
		icon: Clock,
		badgeClass: "text-muted-foreground border-border bg-muted/20",
		iconClass: "text-muted-foreground",
	},
	"in-progress": {
		label: "Working",
		icon: Loader2,
		badgeClass: "text-amber-400 border-amber-500/40 bg-amber-500/10",
		iconClass: "text-amber-400",
	},
	done: {
		label: "Done",
		icon: CheckCircle2,
		badgeClass: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
		iconClass: "text-emerald-400",
	},
	failed: {
		label: "Failed",
		icon: XCircle,
		badgeClass: "text-red-400 border-red-500/40 bg-red-500/10",
		iconClass: "text-red-400",
	},
	"fix-needed": {
		label: "Needs update",
		icon: AlertTriangle,
		badgeClass: "text-orange-400 border-orange-500/40 bg-orange-500/10",
		iconClass: "text-orange-400",
	},
};

function formatDurationMs(ms?: number) {
	if (!ms || Number.isNaN(ms) || ms < 0) return "—";
	if (ms < 1_000) return `${ms}ms`;
	if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
	const minutes = Math.floor(ms / 60_000);
	const seconds = Math.floor((ms % 60_000) / 1_000);
	return `${minutes}m ${seconds}s`;
}

function getToolDuration(tool: NonNullable<OpsFeature["toolActivity"]>[number]) {
	if (!tool.startedAt) return undefined;
	if (tool.completedAt) return Math.max(0, tool.completedAt - tool.startedAt);
	if (tool.status === "running") return Math.max(0, Date.now() - tool.startedAt);
	return undefined;
}

function argsPreview(input: string, maxLen = 120) {
	const cleaned = input.replace(/\s+/g, " ").trim();
	if (cleaned.length <= maxLen) return cleaned;
	return `${cleaned.slice(0, maxLen - 1)}…`;
}

export function FeatureCard({ feature, className }: FeatureCardProps) {
	const [expanded, setExpanded] = useState(false);
	const cfg = statusConfig[feature.status] ?? statusConfig.pending;
	const StatusIcon = cfg.icon;

	const recentTools = useMemo(
		() => (feature.toolActivity ? [...feature.toolActivity].slice(-5).reverse() : []),
		[feature.toolActivity],
	);

	const lastTool = feature.toolActivity?.at(-1);
	const hasLiveTool = Boolean(lastTool && lastTool.status === "running");

	const modelParts = feature.assignedModel?.split("/") ?? [];
	const modelProvider = modelParts.length > 1 ? modelParts[0] : "model";
	const modelName = modelParts.length > 1 ? modelParts.slice(1).join("/") : feature.assignedModel;

	return (
		<Card
			className={cn(
				"border-border/80 bg-card/60 transition-colors",
				expanded && "bg-card border-border",
				feature.status === "in-progress" && "border-amber-500/30 bg-amber-500/5",
				className,
			)}
		>
			<CardContent className="p-0">
				<button
					type="button"
					onClick={() => setExpanded((prev) => !prev)}
					className="w-full px-3 py-3 text-left sm:px-4"
					aria-expanded={expanded}
				>
					<div className="flex items-start gap-3">
						<StatusIcon
							className={cn(
								"mt-0.5 h-4 w-4 shrink-0",
								cfg.iconClass,
								feature.status === "in-progress" && "animate-spin",
							)}
						/>

						<div className="min-w-0 flex-1">
							<div className="flex items-start justify-between gap-2">
								<p className="text-sm font-medium text-foreground break-words">{feature.title}</p>
								<Badge variant="outline" className={cn("shrink-0 text-[10px] uppercase tracking-wide", cfg.badgeClass)}>
									{cfg.label}
								</Badge>
							</div>

							<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
								<span>Phase {feature.phase}</span>
								<span className="hidden sm:inline">·</span>
								<span className="truncate max-w-[220px]">{feature.assignedModel || "unassigned"}</span>
							</div>

							{hasLiveTool && lastTool && (
								<div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
									<span>Live: </span>
									<code className="font-mono">{lastTool.toolName}</code>
								</div>
							)}
						</div>

						<div className="shrink-0 pt-0.5 text-muted-foreground">
							{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</div>
					</div>
				</button>

				{expanded && (
					<div className="border-t border-border/60 px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
						<div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
							<div className="rounded-md border border-border/60 bg-background/40 p-2">
								<p className="text-[10px] uppercase tracking-wide text-muted-foreground">Attempts</p>
								<p className="mt-1 text-sm font-medium text-foreground">{feature.attempts}</p>
							</div>
							<div className="rounded-md border border-border/60 bg-background/40 p-2 sm:col-span-2">
								<p className="text-[10px] uppercase tracking-wide text-muted-foreground">Model details</p>
								<div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
									<Badge variant="outline" className="text-[10px] uppercase">
										{modelProvider || "model"}
									</Badge>
									<code className="font-mono text-xs text-foreground break-all">{modelName || "unknown"}</code>
								</div>
							</div>
						</div>

						<div className="mt-3 space-y-2">
							<p className="text-[10px] uppercase tracking-wide text-muted-foreground">Last 5 tool calls</p>

							{recentTools.length === 0 ? (
								<div className="rounded-md border border-dashed border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
									No tool activity yet.
								</div>
							) : (
								recentTools.map((tool) => {
									const duration = getToolDuration(tool);
									const dotClass =
										tool.status === "running"
											? "bg-amber-400 animate-pulse"
											: tool.status === "success"
												? "bg-emerald-400"
												: "bg-red-400";

									return (
										<div key={tool.id} className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2">
											<div className="flex items-center justify-between gap-2">
												<div className="flex min-w-0 items-center gap-2">
													<span className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)} />
													<code className="truncate font-mono text-[11px] text-foreground">{tool.toolName}</code>
												</div>
												<span className="shrink-0 text-[10px] text-muted-foreground">{formatDurationMs(duration)}</span>
											</div>
											<p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
												{argsPreview(tool.toolArgs)}
											</p>
										</div>
									);
								})
							)}
						</div>

						<div className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
							<Wrench className="h-3 w-3" />
							<span>Click card header to collapse</span>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default FeatureCard;
