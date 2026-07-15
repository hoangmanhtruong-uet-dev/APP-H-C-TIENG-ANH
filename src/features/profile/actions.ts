"use server";

import { revalidatePath } from "next/cache";

import { createRequestId } from "@/lib/api/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCurrentAccount } from "@/server/auth/account";
import type { ActionState } from "@/features/auth/action-state";
import { profileUpdateSchema } from "@/features/auth/schemas";

type ProfileField = "displayName";

export async function updateProfileAction(
  _previousState: ActionState<ProfileField>,
  formData: FormData,
): Promise<ActionState<ProfileField>> {
  const requestId = createRequestId();
  const displayName = formData.get("displayName");
  const result = profileUpdateSchema.safeParse({
    displayName: typeof displayName === "string" ? displayName : "",
  });

  if (!result.success) {
    return {
      status: "error",
      message: "Hãy kiểm tra lại họ và tên.",
      fieldErrors: result.error.flatten().fieldErrors,
      requestId,
    };
  }

  const account = await requireCurrentAccount();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: result.data.displayName })
    .eq("id", account.user.id);

  if (error) {
    return {
      status: "error",
      message: "Không thể lưu hồ sơ lúc này. Hãy thử lại sau.",
      requestId,
    };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Hồ sơ đã được cập nhật.",
    requestId,
  };
}
