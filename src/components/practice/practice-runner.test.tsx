import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PracticeRunner } from "@/components/practice/practice-runner";
import { SubmitAttemptForm } from "@/components/practice/submit-attempt-form";
import type { PracticePageData } from "@/server/practice/content";

vi.mock("@/features/practice/actions", () => ({
  savePracticeAnswerAction: vi.fn(),
  startPracticeAction: vi.fn(),
  submitPracticeAction: vi.fn(),
}));

const fixture: PracticePageData = {
  exercise: {
    id: "set-1",
    slug: "vocabulary-foundations",
    domain: "vocabulary",
    versionId: "version-1",
    title: "Vocabulary Foundations",
    summary: "Summary",
    instructionsMarkdown: "Answer every question.",
    difficulty: "beginner",
  },
  attempt: {
    id: "attempt-1",
    status: "in_progress",
    currentQuestionPosition: 1,
    lastSavedAt: "2026-07-16T00:00:00Z",
  },
  latestResult: null,
  questions: [
    {
      id: "question-1",
      position: 1,
      type: "single_choice",
      promptMarkdown: "Which answer is correct?",
      points: 1,
      options: [
        { id: "option-1", label: "First", position: 1 },
        { id: "option-2", label: "Second", position: 2 },
      ],
      answer: {
        text: null,
        selectedOptionIds: ["option-1"],
        clientRevision: 2,
      },
    },
    {
      id: "question-2",
      position: 2,
      type: "short_text",
      promptMarkdown: "Type the word.",
      points: 1,
      options: [],
      answer: null,
    },
  ],
  activeQuestion: undefined as never,
};
fixture.activeQuestion = fixture.questions[0];

describe("PracticeRunner", () => {
  it("renders saved draft state without exposing correctness", () => {
    render(<PracticeRunner data={fixture} saved={false} error={undefined} />);
    expect(
      screen.getByRole("heading", { name: "Vocabulary Foundations" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "First" })).toBeChecked();
    expect(screen.getByRole("link", { name: "Câu 1, đã lưu" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.queryByText(/đáp án đúng/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nộp bài" })).toBeInTheDocument();
  });

  it("requires explicit confirmation before final submit", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <SubmitAttemptForm
        attemptId="11111111-1111-4111-8111-111111111111"
        exerciseSlug="vocabulary-foundations"
      />,
    );

    const form = screen
      .getByRole("button", { name: "Nộp bài" })
      .closest("form");
    expect(form).not.toBeNull();
    expect(fireEvent.submit(form!)).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("announces persisted and error states", () => {
    const { rerender } = render(
      <PracticeRunner data={fixture} saved error={undefined} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("PostgreSQL");
    rerender(<PracticeRunner data={fixture} saved={false} error="save" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Dữ liệu hiện có vẫn được giữ",
    );
  });
});
