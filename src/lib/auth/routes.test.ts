import { describe, expect, it } from "vitest";

import { isGuestOnlyRoute, isProtectedRoute } from "./routes";

describe("auth route classification", () => {
  it("protects onboarding and every authenticated app surface", () => {
    for (const pathname of [
      "/onboarding",
      "/dashboard",
      "/learn/session",
      "/roadmap",
      "/progress",
      "/profile",
      "/settings",
    ]) {
      expect(isProtectedRoute(pathname), pathname).toBe(true);
    }
  });

  it("does not misclassify similarly prefixed public routes", () => {
    expect(isProtectedRoute("/onboarding-guide")).toBe(false);
    expect(isGuestOnlyRoute("/login/reset")).toBe(false);
    expect(isGuestOnlyRoute("/register")).toBe(true);
  });
});
