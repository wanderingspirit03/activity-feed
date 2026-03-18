import { NextResponse } from "next/server";
export declare const runtime = "nodejs";
export declare const dynamic = "force-dynamic";
export declare function GET(): Promise<
	| NextResponse<{
			current: any;
			history: any;
			system: any;
			processes: any;
			lastPublished: any;
	  }>
	| NextResponse<{
			error: string;
			detail: string;
	  }>
>;
//# sourceMappingURL=route.d.ts.map
