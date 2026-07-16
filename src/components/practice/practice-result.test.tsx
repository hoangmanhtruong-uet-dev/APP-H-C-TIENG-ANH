import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PracticeResultView } from "@/components/practice/practice-result";

describe("PracticeResultView", () => {
  it("renders persisted score, answer and explanation after submit", () => {
    render(
      <PracticeResultView
        data={{
          exercise: {
            slug: "vocabulary-foundations",
            domain: "vocabulary",
            title: "Vocabulary Foundations",
            summary: "Summary",
          },
          options: [
            {
              id: "33000000-0000-4000-8000-000000000001",
              question_id: "32000000-0000-4000-8000-000000000001",
              label: "Correct answer",
              position: 1,
            },
          ],
          result: {
            attemptId: "61111111-1111-4111-8111-111111111111",
            exerciseSetId: "30000000-0000-4000-8000-000000000001",
            exerciseSetVersionId: "31000000-0000-4000-8000-000000000001",
            status: "scored",
            score: 1,
            maxScore: 1,
            submittedAt: "2026-07-16T00:00:00Z",
            reviewAllowed: true,
            questions: [
              {
                questionId: "32000000-0000-4000-8000-000000000001",
                position: 1,
                questionType: "single_choice",
                promptMarkdown: "Choose one.",
                points: 1,
                answerText: null,
                selectedOptionIds: ["33000000-0000-4000-8000-000000000001"],
                isCorrect: true,
                awardedPoints: 1,
                correctOptionIds: ["33000000-0000-4000-8000-000000000001"],
                acceptedTextAnswers: [],
                explanationMarkdown: "Because it is **correct**.",
              },
            ],
          },
        }}
      />,
    );
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getAllByText("Correct answer")).toHaveLength(2);
    expect(screen.getByText(/Because it is/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Làm attempt mới/ }),
    ).toHaveAttribute("href", "/practice/vocabulary-foundations");
  });
});
