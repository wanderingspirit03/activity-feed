import { NextResponse } from "next/server";

import { errorJson } from "@/lib/api-error";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

const ALLOWED_ACTIONS = new Set(["approve", "pause", "resume", "cancel", "intervene"] as const);

type OpsAction = "approve" | "pause" | "resume" | "cancel" | "intervene";

export async function POST(
	request: Request,
	context: { params: Promise<{ opId: string }> },
) {
	try {
		const { opId } = await context.params;
		const body = await request.json().catch(() => null);
		const action = typeof body?.action === "string" ? body.action : "";
		const message = typeof body?.message === "string" ? body.message : undefined;

		if (!ALLOWED_ACTIONS.has(action as OpsAction)) {
			return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}

		const redis = getRedis();
		await redis.publish(
			"ops:commands",
			JSON.stringify({
				opId,
				action,
				message,
				timestamp: new Date().toISOString(),
			}),
		);

		return NextResponse.json({ ok: true, action });
	} catch (error) {
		return errorJson("Failed to publish op action", error);
	}
}
