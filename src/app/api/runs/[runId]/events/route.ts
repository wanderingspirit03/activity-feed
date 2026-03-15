import { NextRequest, NextResponse } from "next/server";

const ACTOR_API_BASE_URL = process.env.ACTOR_API_BASE_URL || "http://localhost:3100";
const DASHBOARD_API_KEY = process.env.DASHBOARD_API_KEY || "";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ runId: string }> },
) {
	const { runId } = await context.params;
	const searchParams = request.nextUrl.searchParams.toString();
	const url = `${ACTOR_API_BASE_URL}/api/runs/${encodeURIComponent(runId)}/events${searchParams ? `?${searchParams}` : ""}`;

	try {
		const res = await fetch(url, {
			headers: {
				Authorization: `Bearer ${DASHBOARD_API_KEY}`,
				Accept: "application/json",
			},
			signal: AbortSignal.timeout(10_000),
		});

		if (!res.ok) {
			return NextResponse.json({ error: `Upstream ${res.status}` }, { status: res.status });
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch {
		return NextResponse.json(
			{ error: "Failed to fetch run events", events: [] },
			{ status: 502 },
		);
	}
}
