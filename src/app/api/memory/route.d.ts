import { NextResponse } from "next/server";
export declare const runtime = "nodejs";
export declare const dynamic = "force-dynamic";
export declare function GET(): Promise<
	| NextResponse<{
			stats: {
				episodes: number;
				semanticEntries: number;
				taskScores: number;
				dbSize: any;
			};
			domains: any;
			recentEpisodes: any;
			dailyActivity: any;
			lastPublished: any;
	  }>
	| NextResponse<{
			error: string;
			detail: string;
	  }>
>;
//# sourceMappingURL=route.d.ts.map
