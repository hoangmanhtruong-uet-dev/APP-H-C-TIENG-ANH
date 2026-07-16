import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LessonMarkdown } from "@/components/learning/lesson-markdown";

describe("LessonMarkdown", () => {
  it("renders Markdown while dropping raw HTML", () => {
    render(
      <LessonMarkdown>
        {"Nội dung **an toàn**. <script>alert('x')</script>"}
      </LessonMarkdown>,
    );

    expect(screen.getByText("an toàn")).toHaveRole("strong");
    expect(document.querySelector("script")).toBeNull();
    expect(screen.queryByText("alert('x')")).not.toBeInTheDocument();
  });

  it("removes unsafe link behavior and hardens external links", () => {
    render(
      <LessonMarkdown>
        {
          "[Không an toàn](javascript:alert(1)) và [Nguồn](https://example.com)."
        }
      </LessonMarkdown>,
    );

    expect(screen.queryByRole("link", { name: "Không an toàn" })).toBeNull();
    expect(screen.getByRole("link", { name: "Nguồn" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });
});
