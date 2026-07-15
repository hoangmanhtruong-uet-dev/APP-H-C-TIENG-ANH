import { NextResponse } from "next/server";

import { createApiSuccess, createRequestId } from "@/lib/api/errors";

export function GET() {
  const requestId = createRequestId();

  return NextResponse.json(
    createApiSuccess(
      {
        status: "ok",
      },
      requestId,
    ),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
