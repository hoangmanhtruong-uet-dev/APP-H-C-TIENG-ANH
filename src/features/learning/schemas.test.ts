import { describe, expect, it } from "vitest";

import {
  learningSlugSchema,
  lessonProgressMutationSchema,
} from "@/features/learning/schemas";

describe("learning schemas", () => {
  it.each(["ielts-foundations", "reading-101", "lesson"])(
    "accepts canonical slug %s",
    (slug) => expect(learningSlugSchema.safeParse(slug).success).toBe(true),
  );

  it.each(["IELTS", "has space", "../lesson", "javascript:alert(1)", ""])(
    "rejects unsafe slug %s",
    (slug) => expect(learningSlugSchema.safeParse(slug).success).toBe(false),
  );

  it("rejects invalid lesson or section identifiers", () => {
    expect(
      lessonProgressMutationSchema.safeParse({
        lessonId: "lesson",
        sectionId: "section",
        moduleSlug: "ielts-foundations",
        lessonSlug: "intro",
      }).success,
    ).toBe(false);
  });
});
