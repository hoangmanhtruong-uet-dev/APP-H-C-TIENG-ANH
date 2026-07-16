"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { requestWritingFeedbackAction } from "@/features/writing/actions";

export function WritingFeedbackRequest({
  taskSlug,
  submissionId,
}: {
  taskSlug: string;
  submissionId: string;
}) {
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function requestFeedback() {
    startTransition(async () => {
      const result = await requestWritingFeedbackAction({
        taskSlug,
        submissionId,
        consent: true,
      });
      setMessage(result.message);
      if (result.status === "ready") window.location.reload();
    });
  }

  return (
    <div className="mt-5">
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] p-4 text-sm leading-6">
        <input
          type="checkbox"
          name="writingAiConsent"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
        />
        <span>
          Tôi đồng ý gửi bài viết đã nộp và đề bài tới nhà cung cấp AI để nhận
          góp ý luyện tập. Góp ý có thể sai và không phải điểm IELTS chính thức.
        </span>
      </label>
      <Button
        type="button"
        className="mt-4 w-full sm:w-auto"
        disabled={!consent || isPending}
        onClick={requestFeedback}
      >
        <Sparkles aria-hidden="true" size={17} />
        {isPending ? "Đang tạo góp ý…" : "Nhận góp ý AI tùy chọn"}
      </Button>
      {message ? (
        <p role="status" className="mt-3 text-sm font-semibold">
          {message}
        </p>
      ) : null}
    </div>
  );
}
