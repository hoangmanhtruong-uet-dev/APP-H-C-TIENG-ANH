import { describe, expect, it } from "vitest";

import { getSafeRedirectPath } from "./safe-redirect";

describe("getSafeRedirectPath", () => {
  it.each([
    ["/profile", "/profile"],
    ["/progress?week=current", "/progress?week=current"],
    ["/dashboard#today", "/dashboard#today"],
  ])("accepts protected internal path %s", (input, expected) => {
    expect(getSafeRedirectPath(input)).toBe(expected);
  });

  it.each([
    "https://malicious.example/profile",
    "//malicious.example",
    "/\\malicious.example",
    "/login",
    "/",
    "%2F%2Fmalicious.example",
    "/%2Fmalicious.example",
    "/dashboard%0Ahttps://malicious.example",
  ])("rejects unsafe redirect %s", (input) => {
    expect(getSafeRedirectPath(input)).toBe("/dashboard");
  });
});
