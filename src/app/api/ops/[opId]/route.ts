import { NextResponse } from "next/server";

import { getRedis } from "@/lib/redis";
import type { OpsData } from "@/stores/ops-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeOpData(input: unknown): OpsData | null {
	if (!input || typeof input !== "object") return null;

	const op = input as Record<string, unknown>;
	if (typeof op.opId !== "string" || op.opId.length === 0) return null;
	if (typeof op.title !== "string" || typeof op.status !== "string") return null;

	const features = Array.isArray(op.features)
		? op.features
				.filter((feature): feature is Record<string, unknown> => Boolean(feature && typeof feature === "object"))
				.map((feature) => ({
					id: String(feature.id ?? ""),
					title: String(feature.title ?? ""),
					status: (feature.status as OpsData["features"][number]["status"]) ?? "pending",
					phase: Number(feature.phase) || 0,
					assignedModel: String(feature.assignedModel ?? ""),
					attempts: Number(feature.attempts) || 0,
				}))
		: [];

	const events = Array.isArray(op.events)
		? op.events
				.filter((event): event is Record<string, unknown> => Boolean(event && typeof event === "object"))
				.map((event) => ({
					id: String(event.id ?? ""),
					timestamp: Number(event.timestamp) || 0,
					type: String(event.type ?? ""),
					title: String(event.title ?? ""),
					featureId: typeof event.featureId === "string" ? event.featureId : undefined,
					status:
						typeof event.status === "string"
							? (event.status as OpsData["events"][number]["status"])
							: undefined,
					verdict: typeof event.verdict === "string" ? event.verdict : undefined,
				}))
		: [];

	return {
		opId: op.opId,
		title: op.title,
		status: op.status,
		features,
		currentPhase: Number(op.currentPhase) || 0,
		totalPhases: Number(op.totalPhases) || 0,
		startedAt: Number(op.startedAt) || 0,
		updatedAt: Number(op.updatedAt) || 0,
		events,
	};
}

export async function GET(
	_request: Request,
	context: { params: Promise<{ opId: string }> },
) {
	try {
		const { opId } = await context.params;
		const redis = getRedis();
		const snapshot = await redis.get(`ops:snapshot:${opId}`);

		if (!snapshot) {
			return NextResponse.json({ error: "Op not found" }, { status: 404 });
		}

		const parsed = JSON.parse(snapshot) as unknown;
		const op = normalizeOpData(parsed);
		if (!op) {
			return NextResponse.json({ error: "Op not found" }, { status: 404 });
		}

		return NextResponse.json({ op });
	} catch (error) {
		return NextResponse.json(
			{ error: "Failed to load op data", detail: String(error) },
			{ status: 500 },
		);
	}
}
