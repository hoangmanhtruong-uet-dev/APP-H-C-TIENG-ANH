"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { ActionState } from "@/features/auth/action-state";
import { updateProfileAction } from "@/features/profile/actions";

type ProfileField = "displayName";
const initialState: ActionState<ProfileField> = { status: "idle" };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Đang lưu…" : "Lưu hồ sơ"}
    </Button>
  );
}

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const error = state.fieldErrors?.displayName?.[0];

  useEffect(() => {
    if (state.status === "error") {
      formRef.current
        ?.querySelector<HTMLElement>("[aria-invalid=true]")
        ?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label
          htmlFor="profile-display-name"
          className="block text-sm font-semibold text-[var(--foreground)]"
        >
          Họ và tên
        </label>
        <input
          id="profile-display-name"
          name="displayName"
          type="text"
          autoComplete="name"
          defaultValue={displayName}
          maxLength={100}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "profile-display-name-error" : undefined}
          className="h-11 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        />
        {error ? (
          <p
            id="profile-display-name-error"
            className="text-sm text-[var(--destructive)]"
          >
            {error}
          </p>
        ) : null}
      </div>
      <div aria-live="polite" aria-atomic="true">
        {state.message ? (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={
              state.status === "success"
                ? "rounded-lg bg-[var(--success-subtle)] p-3 text-sm text-[var(--success)]"
                : "rounded-lg bg-[var(--destructive-subtle)] p-3 text-sm text-[var(--destructive)]"
            }
          >
            {state.message}
            {state.requestId && state.status === "error" ? (
              <span className="mt-1 block text-xs opacity-80">
                Mã yêu cầu: {state.requestId}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      <SaveButton />
    </form>
  );
}
