import { NextResponse } from "next/server";

import {
  createApiError,
  createApiSuccess,
  createRequestId,
} from "@/lib/api/errors";
import { EnvironmentValidationError } from "@/lib/env";
import {
  assertProductionReadiness,
  DependencyReadinessError,
} from "@/server/health/readiness";

export async function GET() {
  const requestId = createRequestId();

  try {
    await assertProductionReadiness();

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

    if (error instanceof DependencyReadinessError) {
      return NextResponse.json(
        createApiError(
          "DEPENDENCY_UNAVAILABLE",
          "A required dependency is unavailable.",
          requestId,
        ),
        {
          status: 503,
          headers: { "Cache-Control": "no-store" },
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
