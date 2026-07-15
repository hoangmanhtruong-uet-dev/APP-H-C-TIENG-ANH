import { describe, expect, it } from "vitest";

import { EnvironmentValidationError, parsePublicEnv } from "@/lib/env";

describe("parsePublicEnv", () => {
  it("accepts valid public Supabase values", () => {
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
  });

  it("returns an actionable error when values are missing", () => {
    expect(() => parsePublicEnv({})).toThrow(EnvironmentValidationError);
    expect(() => parsePublicEnv({})).toThrow("NEXT_PUBLIC_SUPABASE_URL");
    expect(() => parsePublicEnv({})).toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});
