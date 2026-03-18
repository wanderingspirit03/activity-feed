import { Activity, CheckCircle2, Timer, Zap } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface OpsData {
	opId: string;
	title: string;
	status: string;
	features: unknown[];
	startedAt: string;
	updatedAt: string;
}

interface OpAnalyticsProps {
	ops: OpsData[];
}

const COMPLETED_STATUSES = new Set(["completed", "done", "success"]);
const TERMINAL_STATUSES = new Set(["completed", "done", "success", "failed", "cancelled", "canceled"]);
const ACTIVE_STATUSES = new Set(["running", "in-progress", "active"]);

const toLower = (value: string) => value.trim().toLowerCase();

const durationMs = (start: string, end: string): number | null => {
	const startTs = Date.parse(start);
	const endTs = Date.parse(end);
	if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || endTs < startTs) {
		return null;
	}
	return endTs - startTs;
};

const formatDuration = (ms: number): string => {
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}m ${seconds}s`;
};

export function OpAnalytics({ ops }: OpAnalyticsProps) {
	const totalOps = ops.length;
	const terminalOps = ops.filter((op) => TERMINAL_STATUSES.has(toLower(op.status)));
	const completedOps = terminalOps.filter((op) => COMPLETED_STATUSES.has(toLower(op.status)));
	const activeNow = ops.filter((op) => ACTIVE_STATUSES.has(toLower(op.status))).length;

	const successRate = terminalOps.length > 0 ? (completedOps.length / terminalOps.length) * 100 : 0;

	const completedDurations = ops
		.filter((op) => COMPLETED_STATUSES.has(toLower(op.status)))
		.map((op) => durationMs(op.startedAt, op.updatedAt))
		.filter((value): value is number => value !== null);

	const averageDurationMs =
		completedDurations.length > 0
			? completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length
			: 0;

	const avgDurationText = completedDurations.length > 0 ? formatDuration(averageDurationMs) : "—";

	const cards = [
		{
			title: "Total Ops",
			value: String(totalOps),
			subtitle: `${terminalOps.length} terminal`,
			icon: Activity,
			cardTone: "border-border/70",
			iconTone: "text-muted-foreground",
		},
		{
			title: "Success Rate",
			value: `${Math.round(successRate)}%`,
			subtitle: `${completedOps.length}/${terminalOps.length || 0} completed`,
			icon: CheckCircle2,
			cardTone: successRate >= 70 ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5",
			iconTone: successRate >= 70 ? "text-emerald-400" : "text-amber-400",
		},
		{
			title: "Avg Duration",
			value: avgDurationText,
			subtitle:
				completedDurations.length > 0 ? `From ${completedDurations.length} completed ops` : "No completed ops yet",
			icon: Timer,
			cardTone:
				completedDurations.length === 0
					? "border-border/70"
					: averageDurationMs > 30 * 60 * 1000
						? "border-amber-500/40 bg-amber-500/5"
						: "border-emerald-500/40 bg-emerald-500/5",
			iconTone:
				completedDurations.length === 0
					? "text-muted-foreground"
					: averageDurationMs > 30 * 60 * 1000
						? "text-amber-400"
						: "text-emerald-400",
		},
		{
			title: "Active Now",
			value: String(activeNow),
			subtitle: activeNow > 0 ? "Ops currently running" : "No active operations",
			icon: Zap,
			cardTone: activeNow > 0 ? "border-blue-500/45 bg-blue-500/10" : "border-border/70",
			iconTone: activeNow > 0 ? "text-blue-400" : "text-muted-foreground",
		},
	] as const;

	return (
		<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
			{cards.map((card) => {
				const Icon = card.icon;
				return (
					<Card key={card.title} className={cn("border bg-card/60", card.cardTone)}>
						<CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
							<CardDescription>{card.title}</CardDescription>
							<Icon className={cn("h-4 w-4", card.iconTone)} />
						</CardHeader>
						<CardContent>
							<CardTitle className="text-2xl font-semibold tracking-tight">{card.value}</CardTitle>
							<p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
