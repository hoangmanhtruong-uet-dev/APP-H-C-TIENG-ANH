import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedConfirmationTypes = new Set<EmailOtpType>(["email", "signup"]);

function noStoreRedirect(url: URL) {
  return NextResponse.redirect(url, {
    headers: {
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      Expires: "0",
      Pragma: "no-cache",
    },
  });
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const type = rawType as EmailOtpType | null;

  if (tokenHash && type && allowedConfirmationTypes.has(type)) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (!error) {
        const successUrl = request.nextUrl.clone();
        successUrl.pathname = getSafeRedirectPath(
          request.nextUrl.searchParams.get("next"),
        );
        successUrl.search = "";
        return noStoreRedirect(successUrl);
      }
    } catch {
      // Fall through to the same generic confirmation failure state.
    }
  }

  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/login";
  errorUrl.search = "";
  errorUrl.searchParams.set("authError", "confirmation_invalid");
  return noStoreRedirect(errorUrl);
}
