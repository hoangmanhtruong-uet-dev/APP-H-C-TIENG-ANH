import { describe, expect, it } from "vitest";

import {
  formatMockDuration,
  formatMockSectionType,
  formatMockSessionStatus,
} from "@/features/mock-tests/model";

describe("mock test model", () => {
  it("formats the four Phase 10A section types", () => {
    expect(formatMockSectionType("reading")).toBe("Reading");
    expect(formatMockSectionType("listening")).toBe("Listening");
    expect(formatMockSectionType("writing")).toBe("Writing");
    expect(formatMockSectionType("speaking")).toBe("Speaking");
  });

  it("rounds section duration up to whole minutes", () => {
    expect(formatMockDuration(61)).toBe("2 phút");
  });

  it("keeps session status labels distinct", () => {
    expect(formatMockSessionStatus("in_progress")).toBe("Đang làm");
    expect(formatMockSessionStatus("submitted")).toBe("Đang tạo tổng kết");
    expect(formatMockSessionStatus("completed")).toBe("Đã hoàn thành");
    expect(formatMockSessionStatus("abandoned")).toBe("Đã dừng");
  });
});
