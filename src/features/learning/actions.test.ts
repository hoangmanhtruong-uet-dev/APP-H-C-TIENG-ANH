import { describe, expect, it } from "vitest";

import { mapProgressError } from "@/features/learning/action-state";

describe("learning progress error mapping", () => {
  it("maps inaccessible content without leaking database details", () => {
    expect(mapProgressError("P0002", "request-1")).toEqual({
      status: "error",
      message: "Bài học hoặc phần học không còn khả dụng.",
      requestId: "request-1",
    });
  });

  it("maps unknown database failures to a retryable safe message", () => {
    const result = mapProgressError("XX999", "request-2");
    expect(result.message).toBe("Không thể lưu tiến độ lúc này. Hãy thử lại.");
    expect(result.message).not.toContain("XX999");
  });
});
