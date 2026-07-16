import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LearnerProfile } from "@/server/onboarding/learner-profile";

const saveStep = vi.fn(async (...args: unknown[]) => {
  const formData = args.find(
    (value): value is FormData => value instanceof FormData,
  );
  if (!formData) return { status: "idle" as const };
  const step = Number(formData.get("step"));
  if (step === 2 && !formData.get("testType")) {
    return {
      status: "error" as const,
      message: "Hãy kiểm tra lại thông tin ở bước này.",
      fieldErrors: { testType: ["Hãy chọn loại bài thi IELTS."] },
      requestId: "request-error",
    };
  }
  return {
    status: "success" as const,
    message: "Đã lưu tiến độ.",
    requestId: `request-${step}`,
    nextStep: step + 1,
  };
});

vi.mock("@/features/onboarding/actions", () => ({
  saveOnboardingStepAction: (...args: unknown[]) => saveStep(...args),
  completeOnboardingAction: vi.fn(),
}));

import { OnboardingWizard } from "./onboarding-wizard";

const completedProfile: LearnerProfile = {
  user_id: "41111111-1111-4111-8111-111111111111",
  test_type: "academic",
  current_band: 5.5,
  target_band: 7,
  target_exam_date: null,
  daily_study_minutes: 45,
  study_days_per_week: 5,
  priority_skills: ["writing", "speaking"],
  primary_goal: "study_abroad",
  onboarding_step: 8,
  onboarding_completed_at: null,
  created_at: "2026-07-16T00:00:00.000Z",
  updated_at: "2026-07-16T00:00:00.000Z",
};

describe("OnboardingWizard", () => {
  beforeEach(() => saveStep.mockClear());

  it("supports welcome, validation error focus, and back navigation", async () => {
    render(<OnboardingWizard learnerProfile={null} displayName="Minh" />);

    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu thiết lập" }));
    expect(
      screen.getByRole("heading", {
        name: "Bạn đang chuẩn bị cho loại bài thi nào?",
      }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Lưu và tiếp tục" }));
    await expect(
      screen.findByText("Hãy chọn loại bài thi IELTS."),
    ).resolves.toBeVisible();
    await waitFor(() =>
      expect(
        screen.getByRole("radio", { name: /IELTS Academic/ }),
      ).toHaveFocus(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(screen.getByRole("heading", { name: /Chào Minh/ })).toBeVisible();
  });

  it("saves a step and advances to the next semantic form", async () => {
    render(<OnboardingWizard learnerProfile={null} displayName="Minh" />);
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu thiết lập" }));
    fireEvent.click(screen.getByRole("radio", { name: /IELTS Academic/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu và tiếp tục" }));

    await expect(
      screen.findByRole("heading", {
        name: "Band hiện tại của bạn là bao nhiêu?",
      }),
    ).resolves.toBeVisible();
    expect(saveStep).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Band hiện tại")).toHaveValue("unknown");
  });

  it("resumes at review and renders persisted values", () => {
    render(
      <OnboardingWizard learnerProfile={completedProfile} displayName="Minh" />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Kiểm tra lại thiết lập của bạn",
      }),
    ).toBeVisible();
    expect(screen.getByText("IELTS Academic")).toBeVisible();
    expect(screen.getByText("Du học")).toBeVisible();
    expect(screen.getByText("Writing, Speaking")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Hoàn tất onboarding" }),
    ).toBeEnabled();
  });
});
