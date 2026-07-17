import { describe, expect, it } from "vitest";

import {
  EnvironmentValidationError,
  parsePublicEnv,
  parseServerEnv,
} from "@/lib/env";

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

describe("parseServerEnv", () => {
  it("requires the canonical site URL in production", () => {
    expect(() => parseServerEnv({ NODE_ENV: "production" })).toThrow(
      "NEXT_PUBLIC_SITE_URL",
    );
  });

  it("rejects partial AI configuration", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "test",
        OPENAI_API_KEY: "test-key",
      }),
    ).toThrow("signing secret");
  });

  it("accepts an explicitly disabled AI configuration", () => {
    expect(parseServerEnv({ NODE_ENV: "test" })).toMatchObject({
      NODE_ENV: "test",
    });
  });

  it("requires server-only cleanup credentials in production", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "https://ielts.example.com",
      }),
    ).toThrow("STORAGE_CLEANUP_SECRET");
  });

  it("accepts core production config with AI disabled", () => {
    expect(
      parseServerEnv({
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "https://ielts.example.com",
        NEXT_PUBLIC_SUPPORT_EMAIL: "support@ielts.example.com",
        SPEAKING_PIPELINE_SIGNING_SECRET: "s".repeat(32),
        SUPABASE_SERVICE_ROLE_KEY: "server-only-key",
        STORAGE_CLEANUP_SECRET: "c".repeat(32),
      }),
    ).toMatchObject({ NODE_ENV: "production" });
  });
});
