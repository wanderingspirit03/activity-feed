export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTOR_API_BASE_URL = process.env.ACTOR_API_BASE_URL || "http://localhost:3100";
const DASHBOARD_API_KEY = process.env.DASHBOARD_API_KEY || "";
const POLL_INTERVAL_MS = 5_000;

export async function GET(request: Request) {
	const encoder = new TextEncoder();
	let aborted = false;

	request.signal.addEventListener("abort", () => {
		aborted = true;
	});

	const stream = new ReadableStream({
		async start(controller) {
			controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"));

			while (!aborted) {
				try {
					const res = await fetch(`${ACTOR_API_BASE_URL}/api/runs?limit=20`, {
						headers: {
							Authorization: `Bearer ${DASHBOARD_API_KEY}`,
							Accept: "application/json",
						},
						signal: AbortSignal.timeout(10_000),
					});

					if (res.ok) {
						const data = await res.json();
						const sseData = `event: snapshot\ndata: ${JSON.stringify(data)}\n\n`;
						controller.enqueue(encoder.encode(sseData));
					}
				} catch {
					// upstream unavailable — continue polling
				}

				controller.enqueue(encoder.encode(": heartbeat\n\n"));

				if (!aborted) {
					await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
				}
			}

			controller.close();
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no",
		},
	});
}
