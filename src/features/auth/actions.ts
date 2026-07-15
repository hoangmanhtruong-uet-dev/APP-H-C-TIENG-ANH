"use server";

import { redirect } from "next/navigation";

import { createRequestId } from "@/lib/api/errors";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { ActionState } from "./action-state";
import { mapAuthError } from "./errors";
import { loginSchema, registerSchema } from "./schemas";

type LoginField = "email" | "password";
type RegisterField = "displayName" | "email" | "password" | "confirmPassword";

function valueOf(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function registerAction(
  _previousState: ActionState<RegisterField>,
  formData: FormData,
): Promise<ActionState<RegisterField>> {
  const requestId = createRequestId();
  const result = registerSchema.safeParse({
    displayName: valueOf(formData, "displayName"),
    email: valueOf(formData, "email"),
    password: valueOf(formData, "password"),
    confirmPassword: valueOf(formData, "confirmPassword"),
  });

  if (!result.success) {
    return {
      status: "error",
      message: "Hãy kiểm tra lại các trường được đánh dấu.",
      fieldErrors: result.error.flatten().fieldErrors,
      requestId,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: { display_name: result.data.displayName },
      },
    });

    if (error) {
      return {
        status: "error",
        message: mapAuthError(error),
        requestId,
      };
    }

    return {
      status: "success",
      message:
        "Yêu cầu đăng ký đã được ghi nhận. Hãy kiểm tra email để xác minh tài khoản trước khi tiếp tục.",
      requestId,
    };
  } catch {
    return {
      status: "error",
      message: mapAuthError(undefined),
      requestId,
    };
  }
}

export async function loginAction(
  _previousState: ActionState<LoginField>,
  formData: FormData,
): Promise<ActionState<LoginField>> {
  const requestId = createRequestId();
  const result = loginSchema.safeParse({
    email: valueOf(formData, "email"),
    password: valueOf(formData, "password"),
    next: valueOf(formData, "next"),
  });

  if (!result.success) {
    return {
      status: "error",
      message: "Hãy kiểm tra lại các trường được đánh dấu.",
      fieldErrors: result.error.flatten().fieldErrors,
      requestId,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      return {
        status: "error",
        message: mapAuthError(error),
        requestId,
      };
    }
  } catch {
    return {
      status: "error",
      message: mapAuthError(undefined),
      requestId,
    };
  }

  redirect(getSafeRedirectPath(result.data.next));
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
