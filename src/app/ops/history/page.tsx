"use client";

import Link from "next/link";
import { useMemo } from "react";
import { OpAnalytics } from "@/components/ops/OpAnalytics";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOps } from "@/hooks/use-api";
import { formatDuration, formatTimestamp } from "@/lib/format";

type OpFeature = {
	status?: string;
};

type OpItem = {
	id?: string;
	opId?: string;
	title?: string;
	status?: string;
	startedAt?: string | number | null;
	started_at?: string | null;
	completedAt?: string | number | null;
	completed_at?: string | null;
	updatedAt?: string | number | null;
	updated_at?: string | null;
	features?: OpFeature[];
};

type OpsResponse = {
	ops?: OpItem[];
};

function toMs(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value > 1e12 ? value : value * 1000;
	}
	if (typeof value === "string") {
		const parsed = Date.parse(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

function statusClass(status: string) {
	if (status === "running") return "bg-blue-500/15 text-blue-300 border-blue-500/30";
	if (status === "completed") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
	if (status === "failed") return "bg-red-500/15 text-red-300 border-red-500/30";
	if (status === "planning") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
	return "bg-muted text-muted-foreground border-border";
}

function humanStatus(status?: string) {
	return String(status ?? "unknown").replace(/[-_]/g, " ");
}

export default function OpsHistoryPage() {
	const { data, isLoading, error } = useOps() as {
		data?: OpsResponse;
		isLoading: boolean;
		error?: Error;
	};

	const ops = useMemo(() => {
		const list = data?.ops ?? [];
		return [...list].sort((a, b) => {
			const aTs = toMs(a.updatedAt ?? a.updated_at);
			const bTs = toMs(b.updatedAt ?? b.updated_at);
			return bTs - aTs;
		});
	}, [data?.ops]);

	return (
		<main className="mx-auto max-w-6xl space-y-6 px-3 py-4 sm:px-4 md:px-8 sm:py-6 pb-24 md:pb-6">
			<section className="space-y-1">
				<h1 className="text-2xl font-semibold md:text-3xl">Operation History</h1>
				<p className="text-sm text-muted-foreground">Recent operations with status, progress, and timing.</p>
			</section>

			<OpAnalytics ops={ops as any} />

			{isLoading ? (
				<div className="grid grid-cols-1 gap-4">
					{Array.from({ length: 3 }).map((_, index) => (
						<Card key={index} className="bg-card">
							<CardHeader>
								<div className="h-4 w-48 animate-pulse rounded bg-muted" />
								<div className="h-3 w-32 animate-pulse rounded bg-muted" />
							</CardHeader>
						</Card>
					))}
				</div>
			) : error ? (
				<Card className="bg-card border-red-500/30">
					<CardContent className="py-6 text-center text-sm text-red-400">
						Failed to load operations. Please try again later.
					</CardContent>
				</Card>
			) : ops.length === 0 ? (
				<Card className="bg-card">
					<CardContent className="py-10 text-center text-sm text-muted-foreground">No operations found.</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 gap-4">
					{ops.map((op) => {
						const status = String(op.status ?? "planning").toLowerCase();
						const startedMs = toMs(op.startedAt ?? op.started_at);
						const completedMs = toMs(op.completedAt ?? op.completed_at);
						const durationMs = startedMs > 0 ? Math.max(0, (completedMs || Date.now()) - startedMs) : 0;

						const features = Array.isArray(op.features) ? op.features : [];
						const doneCount = features.filter((feature) => {
							const value = String(feature.status ?? "").toLowerCase();
							return value === "done" || value === "completed";
						}).length;

						const opKey = op.opId ?? op.id ?? "unknown-op";

						return (
							<Link key={opKey} href={`/ops/${op.opId ?? op.id}`} className="block">
								<Card className="bg-card transition-colors hover:bg-muted/20">
									<CardHeader className="space-y-3">
										<div className="flex flex-wrap items-start justify-between gap-2">
											<div className="min-w-0">
												<CardTitle className="truncate text-lg">{op.title ?? op.opId ?? op.id}</CardTitle>
												<CardDescription className="mt-1 font-mono text-xs">{op.opId ?? op.id}</CardDescription>
											</div>
											<Badge className={statusClass(status)}>{humanStatus(status)}</Badge>
										</div>

										<div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
											<div>
												<p className="uppercase tracking-wide">Features</p>
												<p className="mt-1 font-mono text-foreground">
													{doneCount}/{features.length}
												</p>
											</div>
											<div>
												<p className="uppercase tracking-wide">Duration</p>
												<p className="mt-1 font-mono text-foreground">
													{durationMs > 0 ? formatDuration(durationMs) : "—"}
												</p>
											</div>
											<div>
												<p className="uppercase tracking-wide">Started</p>
												<p className="mt-1 text-foreground">{startedMs > 0 ? formatTimestamp(startedMs) : "—"}</p>
											</div>
											<div>
												<p className="uppercase tracking-wide">Updated</p>
												<p className="mt-1 text-foreground">{formatTimestamp(toMs(op.updatedAt ?? op.updated_at))}</p>
											</div>
										</div>
									</CardHeader>
								</Card>
							</Link>
						);
					})}
				</div>
			)}
		</main>
	);
}
