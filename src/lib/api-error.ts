import { NextResponse } from "next/server";

export function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function errorJson(message: string, error: unknown, status = 500) {
  return NextResponse.json(
    {
      error: message,
      detail: errorDetail(error),
    },
    { status },
  );
}
