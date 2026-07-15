"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { AuthSubmitButton } from "@/components/auth/submit-button";
import type { ActionState } from "@/features/auth/action-state";
import { loginAction } from "@/features/auth/actions";

type LoginField = "email" | "password";
const initialState: ActionState<LoginField> = { status: "idle" };

export function LoginForm({
  next,
  initialMessage,
}: {
  next?: string;
  initialMessage?: string;
}) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "error") return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    firstInvalid?.focus();
  }, [state]);

  const emailError = state.fieldErrors?.email?.[0];
  const passwordError = state.fieldErrors?.password?.[0];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_50px_rgba(35,55,95,0.08)] sm:p-8">
      {initialMessage ? (
        <p className="mb-5 rounded-lg bg-[var(--warning-subtle)] p-3 text-sm leading-6 text-[var(--warning)]">
          {initialMessage}
        </p>
      ) : null}
      <form ref={formRef} action={formAction} className="space-y-5" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="space-y-2">
          <label
            htmlFor="login-email"
            className="block text-sm font-semibold text-[var(--foreground)]"
          >
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            inputMode="email"
            maxLength={254}
            required
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "login-email-error" : undefined}
            placeholder="ban@example.com…"
            className="h-11 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          />
          {emailError ? (
            <p
              id="login-email-error"
              className="text-sm text-[var(--destructive)]"
            >
              {emailError}
            </p>
          ) : null}
        </div>
        <PasswordInput
          id="login-password"
          name="password"
          label="Mật khẩu"
          autoComplete="current-password"
          error={passwordError}
        />
        <div aria-live="polite" aria-atomic="true">
          {state.message ? (
            <p
              role={state.status === "error" ? "alert" : "status"}
              className="rounded-lg bg-[var(--destructive-subtle)] p-3 text-sm leading-6 text-[var(--destructive)]"
            >
              {state.message}
              {state.requestId ? (
                <span className="mt-1 block text-xs opacity-80">
                  Mã yêu cầu: {state.requestId}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <AuthSubmitButton
          idleLabel="Đăng nhập"
          pendingLabel="Đang đăng nhập…"
        />
      </form>
      <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
        Chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          Đăng ký
        </Link>
      </p>
    </div>
  );
}
