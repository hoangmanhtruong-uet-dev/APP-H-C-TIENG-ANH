import { describe, expect, it } from "vitest";

import { getConfirmationMessage, mapAuthError } from "./errors";

describe("auth error mapping", () => {
  it("maps provider codes without leaking raw messages", () => {
    expect(
      mapAuthError({
        code: "invalid_credentials",
        message: "provider raw error",
        status: 400,
      }),
    ).toBe("Email hoặc mật khẩu chưa đúng.");
  });

  it("maps rate limiting and confirmation failures", () => {
    expect(mapAuthError({ status: 429 })).toContain("quá nhiều yêu cầu");
    expect(getConfirmationMessage("confirmation_invalid")).toContain(
      "không hợp lệ",
    );
  });
});
