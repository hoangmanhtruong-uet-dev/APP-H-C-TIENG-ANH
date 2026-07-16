import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ModuleCatalog } from "@/components/learning/module-catalog";
import type { LearningModuleSummary } from "@/server/learning/content";

const moduleFixture: LearningModuleSummary = {
  id: "module-1",
  slug: "ielts-foundations",
  title: "Nền tảng IELTS",
  description: "Hiểu những khái niệm cốt lõi.",
  skill: "foundations",
  testType: "both",
  difficulty: "beginner",
  displayOrder: 1,
  estimatedMinutes: 30,
  progressPercent: 50,
  completedLessons: 1,
  totalLessons: 2,
  lessons: [],
};

describe("ModuleCatalog", () => {
  it("renders real module metadata and accessible progress", () => {
    render(<ModuleCatalog modules={[moduleFixture]} />);

    expect(
      screen.getByRole("heading", { name: "Nền tảng IELTS" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Academic & General Training")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Tiến độ Nền tảng IELTS" }),
    ).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByRole("link", { name: "Mở module" })).toHaveAttribute(
      "href",
      "/learn/ielts-foundations",
    );
  });

  it("renders an honest empty state", () => {
    render(<ModuleCatalog modules={[]} />);
    expect(
      screen.getByRole("heading", { name: "Chưa có nội dung đã xuất bản" }),
    ).toBeInTheDocument();
  });
});
