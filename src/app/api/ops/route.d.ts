import { NextResponse } from "next/server";
import type { OpsData } from "@/stores/ops-store";
export declare const runtime = "nodejs";
export declare const dynamic = "force-dynamic";
export declare function GET(): Promise<NextResponse<{
    ops: OpsData[];
}> | NextResponse<{
    error: string;
    detail: string;
}>>;
export declare function POST(request: Request): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    ok: boolean;
    action: string;
}>>;
//# sourceMappingURL=route.d.ts.map