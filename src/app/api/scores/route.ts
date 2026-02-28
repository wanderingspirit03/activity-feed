import { NextResponse } from "next/server";

import { getScores } from "@/lib/scores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const data = await getScores();
		return NextResponse.json(data);
	} catch (error) {
		return NextResponse.json(
			{ error: "Failed to load scores", detail: String(error) },
			{ status: 500 },
		);
	}
}
