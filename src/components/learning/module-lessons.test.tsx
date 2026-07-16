import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ModuleLessons } from "@/components/learning/module-lessons";
import type { LearningModuleSummary } from "@/server/learning/content";

const moduleFixture: LearningModuleSummary = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: "ielts-foundations",
  title: "Nền tảng IELTS",
  description: "Kiến thức nền tảng.",
  skill: "foundations",
  testType: "both",
  difficulty: "beginner",
  displayOrder: 1,
  estimatedMinutes: 30,
  progressPercent: 50,
  completedLessons: 0,
  totalLessons: 1,
  lessons: [
    {
      id: "20000000-0000-4000-8000-000000000001",
      moduleId: "10000000-0000-4000-8000-000000000001",
      moduleSlug: "ielts-foundations",
      moduleTitle: "Nền tảng IELTS",
      moduleOrder: 1,
      slug: "hieu-cau-truc-bai-thi",
      lessonOrder: 1,
      versionId: "30000000-0000-4000-8000-000000000001",
      title: "Hiểu cấu trúc bài thi IELTS",
      summary: "Tóm tắt bài học.",
      difficulty: "beginner",
      estimatedMinutes: 15,
      status: "in_progress",
      progressPercent: 50,
      currentSectionId: null,
      lastAccessedAt: "2026-07-16T10:00:00Z",
      completedAt: null,
      href: "/learn/ielts-foundations/hieu-cau-truc-bai-thi",
    },
  ],
};

describe("ModuleLessons", () => {
  it("renders lesson status, progress and semantic action link", () => {
    render(<ModuleLessons module={moduleFixture} />);

    expect(
      screen.getByRole("heading", { name: "Hiểu cấu trúc bài thi IELTS" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Đang học")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: "Tiến độ Hiểu cấu trúc bài thi IELTS",
      }),
    ).toHaveAttribute("aria-valuenow", "50");
    expect(
      screen.getByRole("link", {
        name: "Tiếp tục học: Hiểu cấu trúc bài thi IELTS",
      }),
    ).toHaveAttribute("href", "/learn/ielts-foundations/hieu-cau-truc-bai-thi");
  });

  it("renders an empty lesson state", () => {
    render(
      <ModuleLessons
        module={{ ...moduleFixture, lessons: [], totalLessons: 0 }}
      />,
    );
    expect(
      screen.getByText("Module này chưa có bài học đã xuất bản."),
    ).toBeInTheDocument();
  });
});
