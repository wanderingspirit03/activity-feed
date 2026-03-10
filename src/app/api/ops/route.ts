import { NextResponse } from "next/server";

import { errorJson } from "@/lib/api-error";
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

export async function GET() {
	try {
		const redis = getRedis();
		const keys = await redis.keys("ops:snapshot:*");

		if (keys.length === 0) {
			return NextResponse.json({ ops: [] as OpsData[] });
		}

		const snapshots = await redis.mget(keys);
		const ops: OpsData[] = [];

		for (const snapshot of snapshots) {
			if (!snapshot) continue;
			try {
				const parsed = JSON.parse(snapshot) as unknown;
				const normalized = normalizeOpData(parsed);
				if (normalized) ops.push(normalized);
			} catch {
				// Ignore malformed snapshots and continue.
			}
		}

		ops.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

		return NextResponse.json({ ops });
	} catch (error) {
		return errorJson("Failed to load ops data", error);
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json().catch(() => null);
		const description = typeof body?.description === "string" ? body.description.trim() : "";

		if (!description) {
			return NextResponse.json({ error: "description is required" }, { status: 400 });
		}

		const redis = getRedis();
		await redis.publish(
			"ops:commands",
			JSON.stringify({
				action: "create",
				description,
				timestamp: new Date().toISOString(),
			}),
		);

		return NextResponse.json({ ok: true, action: "create" });
	} catch (error) {
		return errorJson("Failed to publish ops command", error);
	}
}
