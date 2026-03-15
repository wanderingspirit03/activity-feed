"use client";

import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Clock } from "lucide-react";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { PhaseTracker } from "@/components/feed/PhaseTracker";
import { ActivityCard } from "@/components/feed/ActivityCard";
import { SpecialistAvatar } from "@/components/feed/SpecialistAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";

function formatElapsed(startedAt: number): string {
	const diff = Math.floor((Date.now() - startedAt) / 1000);
	if (diff < 60) return diff + "s";
	if (diff < 3600) {
		const m = Math.floor(diff / 60);
		const s = diff % 60;
		return m + "m " + s + "s";
	}
	const h = Math.floor(diff / 3600);
	const m = Math.floor((diff % 3600) / 60);
	return h + "h " + m + "m";
}

function getStatusBadge(phase: string) {
	switch (phase) {
		case "complete":
			return { label: "Complete", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" };
		case "error":
			return { label: "Issue", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" };
		default:
			return { label: "Working", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" };
	}
}

export default function RunDetailPage() {
	const params = useParams();
	const router = useRouter();
	const { runs } = useActivityFeed();
	const [elapsed, setElapsed] = useState("");

	const runId = params.id as string;
	const run = runs.find((r) => r.runId === runId);

	useEffect(() => {
		if (!run) return;
		const update = () => setElapsed(formatElapsed(run.startedAt));
		update();
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	}, [run]);

	if (!run) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center space-y-4">
					<p className="text-lg text-muted-foreground">Run not found</p>
					<Button variant="outline" onClick={() => router.push("/")}>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to feed
					</Button>
				</div>
			</div>
		);
	}

	const statusBadge = getStatusBadge(run.phase);

	return (
		<div className="min-h-screen bg-background">
			<header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
				<div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
					<Button variant="ghost" size="sm" onClick={() => router.push("/")} className="gap-1.5">
						<ArrowLeft className="w-4 h-4" />
						Back
					</Button>
					<Separator orientation="vertical" className="h-5" />
					<span className="text-sm text-muted-foreground truncate flex-1">
						{run.task.length > 50 ? run.task.slice(0, 50) + "..." : run.task}
					</span>
				</div>
			</header>

			<main className="max-w-3xl mx-auto px-4 py-6">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 space-y-6">
						<Card>
							<CardContent className="p-6">
								<p className="text-base font-medium leading-relaxed">{run.task}</p>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-6">
								<PhaseTracker currentPhase={run.phase} />
							</CardContent>
						</Card>

						<div className="space-y-2">
							<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">Activity</h2>
							<Card>
								<CardContent className="p-4 space-y-1">
									<AnimatePresence>
										{run.activities.slice().reverse().map((activity, i) => (
											<ActivityCard key={activity.id} activity={activity} isLatest={i === 0} />
										))}
									</AnimatePresence>
								</CardContent>
							</Card>
						</div>
					</div>

					<div className="space-y-4">
						<Card>
							<CardContent className="p-4 space-y-3">
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
								<Badge className={statusBadge.className}>{statusBadge.label}</Badge>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-4 space-y-3">
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Time Elapsed</p>
								<div className="flex items-center gap-2">
									<Clock className="w-4 h-4 text-muted-foreground" />
									<motion.span key={elapsed} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="text-lg font-semibold tabular-nums">
										{elapsed}
									</motion.span>
								</div>
							</CardContent>
						</Card>

						{run.specialist && (
							<Card>
								<CardContent className="p-4 space-y-3">
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Specialist</p>
									<SpecialistAvatar name={run.specialist} isWorking={run.phase !== "complete" && run.phase !== "error"} />
								</CardContent>
							</Card>
						)}

						<Card>
							<CardContent className="p-4 space-y-3">
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</p>
								<div className="space-y-2">
									<div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
										<motion.div className="absolute inset-y-0 left-0 rounded-full bg-blue-500" animate={{ width: run.progress + "%" }} transition={{ duration: 0.5 }} />
									</div>
									<p className="text-sm font-medium tabular-nums text-right">{run.progress}%</p>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</div>
	);
}
