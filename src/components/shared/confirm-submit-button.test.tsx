import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmSubmitButton } from "./confirm-submit-button";

describe("ConfirmSubmitButton", () => {
  it("requires a second explicit action before final submit", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmSubmitButton
        label="Nộp bài"
        title="Nộp bài?"
        description="Bài đã nộp không thể sửa."
        onConfirm={onConfirm}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Nộp bài" });
    fireEvent.click(trigger);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Xác nhận nộp bài" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes on Escape without confirming", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmSubmitButton
        label="Hoàn tất"
        title="Hoàn tất?"
        description="Kiểm tra lần cuối trước khi hoàn tất."
        onConfirm={onConfirm}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Hoàn tất" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(onConfirm).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });
});
