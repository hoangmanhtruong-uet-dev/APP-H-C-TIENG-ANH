"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { AuthSubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/features/auth/action-state";
import { registerAction } from "@/features/auth/actions";

type RegisterField = "displayName" | "email" | "password" | "confirmPassword";
const initialState: ActionState<RegisterField> = { status: "idle" };

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "error") return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    firstInvalid?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div
        className="rounded-2xl border border-[var(--success-soft)] bg-[var(--success-subtle)] p-6 sm:p-8"
        role="status"
      >
        <CircleCheck
          aria-hidden="true"
          className="text-[var(--success)]"
          size={28}
          strokeWidth={1.8}
        />
        <h2 className="mt-5 text-xl font-bold text-[var(--foreground)]">
          Kiểm tra hộp thư của bạn
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--success)]">
          {state.message}
        </p>
        <Button asChild className="mt-6">
          <Link href="/login">Tới trang đăng nhập</Link>
        </Button>
      </div>
    );
  }

  const displayNameError = state.fieldErrors?.displayName?.[0];
  const emailError = state.fieldErrors?.email?.[0];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_50px_rgba(35,55,95,0.08)] sm:p-8">
      <form ref={formRef} action={formAction} className="space-y-5" noValidate>
        <div className="space-y-2">
          <label
            htmlFor="register-display-name"
            className="block text-sm font-semibold text-[var(--foreground)]"
          >
            Họ và tên
          </label>
          <input
            id="register-display-name"
            name="displayName"
            type="text"
            autoComplete="name"
            maxLength={100}
            required
            aria-invalid={Boolean(displayNameError)}
            aria-describedby={
              displayNameError ? "register-display-name-error" : undefined
            }
            placeholder="Nguyễn Minh Anh…"
            className="h-11 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          />
          {displayNameError ? (
            <p
              id="register-display-name-error"
              className="text-sm text-[var(--destructive)]"
            >
              {displayNameError}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label
            htmlFor="register-email"
            className="block text-sm font-semibold text-[var(--foreground)]"
          >
            Email
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            inputMode="email"
            maxLength={254}
            required
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "register-email-error" : undefined}
            placeholder="ban@example.com…"
            className="h-11 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          />
          {emailError ? (
            <p
              id="register-email-error"
              className="text-sm text-[var(--destructive)]"
            >
              {emailError}
            </p>
          ) : null}
        </div>
        <PasswordInput
          id="register-password"
          name="password"
          label="Mật khẩu"
          autoComplete="new-password"
          error={state.fieldErrors?.password?.[0]}
          minLength={8}
        />
        <PasswordInput
          id="register-confirm-password"
          name="confirmPassword"
          label="Xác nhận mật khẩu"
          autoComplete="new-password"
          error={state.fieldErrors?.confirmPassword?.[0]}
          minLength={8}
        />
        <div aria-live="polite" aria-atomic="true">
          {state.message ? (
            <p
              role="alert"
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
          idleLabel="Tạo tài khoản"
          pendingLabel="Đang tạo tài khoản…"
        />
      </form>
      <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
