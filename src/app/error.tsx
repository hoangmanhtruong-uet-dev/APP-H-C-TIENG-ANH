"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send only non-sensitive metadata to an error tracker when configured.
    void error.digest;
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <ErrorState
        action={
          <Button type="button" size="sm" onClick={reset}>
            Thử lại
          </Button>
        }
      />
    </main>
  );
}
