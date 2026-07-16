import { describe, expect, it } from "vitest";

import {
  areRequiredSectionsComplete,
  calculateRequiredProgress,
  isSafeContentHref,
  selectNextLesson,
  selectResumeSection,
} from "@/features/learning/model";

const sections = [
  { id: "first", displayOrder: 1, isRequired: true, completed: true },
  { id: "second", displayOrder: 2, isRequired: true, completed: false },
  { id: "optional", displayOrder: 3, isRequired: false, completed: true },
];

describe("learning progress model", () => {
  it("calculates progress from required sections only", () => {
    expect(calculateRequiredProgress(sections)).toBe(50);
    expect(areRequiredSectionsComplete(sections)).toBe(false);
  });

  it("requires at least one required section for completion", () => {
    expect(
      areRequiredSectionsComplete([
        {
          id: "optional",
          displayOrder: 1,
          isRequired: false,
          completed: true,
        },
      ]),
    ).toBe(false);
  });

  it("uses current section then first incomplete section for resume", () => {
    expect(selectResumeSection(sections, "optional")?.id).toBe("optional");
    expect(selectResumeSection(sections, "missing")?.id).toBe("second");
  });

  it("prefers recent in-progress lesson then catalog order", () => {
    expect(
      selectNextLesson([
        {
          id: "new",
          moduleOrder: 1,
          lessonOrder: 1,
          status: "not_started",
          lastAccessedAt: null,
        },
        {
          id: "older",
          moduleOrder: 2,
          lessonOrder: 1,
          status: "in_progress",
          lastAccessedAt: "2026-07-15T10:00:00Z",
        },
        {
          id: "recent",
          moduleOrder: 3,
          lessonOrder: 1,
          status: "in_progress",
          lastAccessedAt: "2026-07-16T10:00:00Z",
        },
      ])?.id,
    ).toBe("recent");
  });

  it("never selects completed lesson", () => {
    expect(
      selectNextLesson([
        {
          id: "complete",
          moduleOrder: 1,
          lessonOrder: 1,
          status: "completed",
          lastAccessedAt: "2026-07-16T10:00:00Z",
        },
      ]),
    ).toBeNull();
  });
});

describe("safe lesson links", () => {
  it.each(["https://example.com", "http://example.com", "/learn", "#part"])(
    "allows %s",
    (href) => expect(isSafeContentHref(href)).toBe(true),
  );

  it.each(["javascript:alert(1)", "data:text/html,x", "not a url", undefined])(
    "rejects unsafe href %s",
    (href) => expect(isSafeContentHref(href)).toBe(false),
  );
});
