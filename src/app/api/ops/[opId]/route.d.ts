import { NextResponse } from "next/server";
export declare const runtime = "nodejs";
export declare const dynamic = "force-dynamic";
export declare function GET(_request: Request, context: {
    params: Promise<{
        opId: string;
    }>;
}): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    op: any;
}>>;
//# sourceMappingURL=route.d.ts.map