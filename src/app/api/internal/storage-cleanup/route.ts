import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import {
  createApiError,
  createApiSuccess,
  createRequestId,
} from "@/lib/api/errors";
import { getServerEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 100;

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    if (
      !isAuthorized(
        request.headers.get("authorization"),
        process.env.STORAGE_CLEANUP_SECRET,
      )
    ) {
      return responseError("NOT_FOUND", "Route not found.", requestId, 404);
    }

    getServerEnv();

    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const [expireIntentsResult, assetsResult] = await Promise.all([
      admin
        .from("speaking_upload_intents")
        .update({ status: "expired" })
        .eq("status", "issued")
        .lte("expires_at", now)
        .select("id"),
      admin.rpc("claim_speaking_audio_cleanup", {
        p_batch_size: BATCH_SIZE,
      }),
    ]);

    if (expireIntentsResult.error || assetsResult.error)
      throw new Error("cleanup_query_failed");
    const claimedAssets = assetsResult.data as Array<{
      id: string;
      storage_path: string;
    }>;

    const intentsResult = await admin
      .from("speaking_upload_intents")
      .select("id, storage_path")
      .eq("status", "expired")
      .is("storage_deleted_at", null)
      .order("expires_at")
      .limit(BATCH_SIZE);
    if (intentsResult.error) throw new Error("cleanup_query_failed");

    const paths = [
      ...new Set(
        [...intentsResult.data, ...claimedAssets].map(
          (row) => row.storage_path,
        ),
      ),
    ];
    if (paths.length > 0) {
      const { error } = await admin.storage
        .from("speaking-recordings")
        .remove(paths);
      if (error) throw new Error("cleanup_storage_failed");
    }

    const [intentUpdate, assetUpdate] = await Promise.all([
      intentsResult.data.length > 0
        ? admin
            .from("speaking_upload_intents")
            .update({ storage_deleted_at: now })
            .in(
              "id",
              intentsResult.data.map((row) => row.id),
            )
        : Promise.resolve({ error: null }),
      claimedAssets.length > 0
        ? admin
            .from("speaking_audio_assets")
            .update({
              status: "deleted",
              deleted_at: now,
              cleanup_started_at: null,
            })
            .eq("status", "cleanup_pending")
            .in(
              "id",
              claimedAssets.map((row) => row.id),
            )
        : Promise.resolve({ error: null }),
    ]);
    if (intentUpdate.error || assetUpdate.error)
      throw new Error("cleanup_finalize_failed");

    return NextResponse.json(
      createApiSuccess(
        {
          status: "completed",
          expiredIntents: intentsResult.data.length,
          deletedAssets: claimedAssets.length,
        },
        requestId,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return responseError(
      "INTERNAL_ERROR",
      "Storage cleanup could not be completed.",
      requestId,
      500,
    );
  }
}

function isAuthorized(header: string | null, expected: string | undefined) {
  if (!header?.startsWith("Bearer ") || !expected) return false;
  const supplied = Buffer.from(header.slice(7));
  const configured = Buffer.from(expected);
  return (
    supplied.length === configured.length &&
    timingSafeEqual(supplied, configured)
  );
}

function responseError(
  code: "NOT_FOUND" | "INTERNAL_ERROR",
  message: string,
  requestId: string,
  status: number,
) {
  return NextResponse.json(createApiError(code, message, requestId), {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
