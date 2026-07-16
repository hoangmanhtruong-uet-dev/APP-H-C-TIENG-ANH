"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { submitPracticeAction } from "@/features/practice/actions";

export function SubmitAttemptForm({
  attemptId,
  exerciseSlug,
}: {
  attemptId: string;
  exerciseSlug: string;
}) {
  return (
    <form
      action={submitPracticeAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Nộp bài ngay? Bạn sẽ không thể sửa attempt này sau khi chấm điểm.",
          )
        ) {
          event.preventDefault();
        }
      }}
      className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-5"
    >
      <input type="hidden" name="attemptId" value={attemptId} />
      <input type="hidden" name="exerciseSlug" value={exerciseSlug} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">Nộp và chấm bài</h2>
          <p
            id="submit-practice-note"
            className="mt-1 text-sm text-[var(--muted-foreground)]"
          >
            Sau khi nộp, attempt và câu trả lời không thể chỉnh sửa.
          </p>
        </div>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-describedby="submit-practice-note"
    >
      {pending ? "Đang chấm…" : "Nộp bài"}
    </Button>
  );
}
