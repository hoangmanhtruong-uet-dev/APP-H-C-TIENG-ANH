import { NextResponse } from "next/server";

import {
  createApiError,
  createApiSuccess,
  createRequestId,
} from "@/lib/api/errors";
import { EnvironmentValidationError, getPublicEnv } from "@/lib/env";

export function GET() {
  const requestId = createRequestId();

  try {
    getPublicEnv();

    return NextResponse.json(
      createApiSuccess(
        {
          status: "ready",
        },
        requestId,
      ),
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof EnvironmentValidationError) {
      return NextResponse.json(
        createApiError(
          "CONFIGURATION_ERROR",
          "Required public environment variables are missing or invalid.",
          requestId,
        ),
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      createApiError("INTERNAL_ERROR", "Readiness check failed.", requestId),
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
