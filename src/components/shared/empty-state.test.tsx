import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/shared/empty-state";

describe("EmptyState", () => {
  it("announces a clear title and description", () => {
    render(
      <EmptyState
        title="Chưa có nhiệm vụ"
        description="Hãy tạo lộ trình trước."
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Chưa có nhiệm vụ" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hãy tạo lộ trình trước.")).toBeInTheDocument();
  });
});
