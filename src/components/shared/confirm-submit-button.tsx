"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";

type ConfirmSubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  title: string;
  description: string;
  confirmLabel?: string;
  disabled?: boolean;
  pending?: boolean;
  className?: string;
  onConfirm?: () => void;
};

export function ConfirmSubmitButton({
  label,
  pendingLabel = "Đang nộp…",
  title,
  description,
  confirmLabel = "Xác nhận nộp bài",
  disabled,
  pending,
  className,
  onConfirm,
}: ConfirmSubmitButtonProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      if (event.shiftKey && document.activeElement === cancelRef.current) {
        event.preventDefault();
        confirmRef.current?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === confirmRef.current
      ) {
        event.preventDefault();
        cancelRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const trigger = triggerRef.current;
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        className={className}
        disabled={disabled || pending}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {pending ? pendingLabel : label}
      </Button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 grid place-items-center p-4">
              <button
                type="button"
                aria-label="Hủy xác nhận nộp bài"
                className="absolute inset-0 bg-[rgba(12,20,39,0.58)] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-inset"
                onClick={() => setOpen(false)}
              />
              <section
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="submit-confirmation-title"
                aria-describedby="submit-confirmation-description"
                className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
              >
                <h2
                  id="submit-confirmation-title"
                  className="text-xl font-bold text-pretty"
                >
                  {title}
                </h2>
                <p
                  id="submit-confirmation-description"
                  className="mt-3 leading-7 text-[var(--muted-foreground)]"
                >
                  {description}
                </p>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    ref={cancelRef}
                    type="button"
                    variant="secondary"
                    onClick={() => setOpen(false)}
                  >
                    Tiếp tục chỉnh sửa
                  </Button>
                  <Button
                    ref={confirmRef}
                    type="button"
                    onClick={() => {
                      const form = triggerRef.current?.form;
                      setOpen(false);
                      if (onConfirm) onConfirm();
                      else queueMicrotask(() => form?.requestSubmit());
                    }}
                  >
                    {confirmLabel}
                  </Button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
