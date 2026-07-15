import { describe, expect, it } from "vitest";

import { loginAction, registerAction } from "./actions";

describe("auth server action validation", () => {
  it("returns register field errors before contacting Supabase", async () => {
    const formData = new FormData();
    formData.set("displayName", "");
    formData.set("email", "not-an-email");
    formData.set("password", "short");
    formData.set("confirmPassword", "different");

    const state = await registerAction({ status: "idle" }, formData);

    expect(state.status).toBe("error");
    expect(state.fieldErrors?.displayName).toBeDefined();
    expect(state.fieldErrors?.email).toBeDefined();
    expect(state.fieldErrors?.password).toBeDefined();
    expect(state.fieldErrors?.confirmPassword).toBeDefined();
  });

  it("returns login field errors before contacting Supabase", async () => {
    const formData = new FormData();
    formData.set("email", "bad");
    formData.set("password", "");

    const state = await loginAction({ status: "idle" }, formData);

    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email).toBeDefined();
    expect(state.fieldErrors?.password).toBeDefined();
  });
});
