import { NextResponse } from "next/server";
export declare const runtime = "nodejs";
export declare function POST(
	request: Request,
	context: {
		params: Promise<{
			opId: string;
		}>;
	},
): Promise<
	| NextResponse<{
			error: string;
	  }>
	| NextResponse<{
			ok: boolean;
			action: any;
	  }>
>;
//# sourceMappingURL=route.d.ts.map
