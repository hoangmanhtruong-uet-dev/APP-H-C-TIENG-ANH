export type MockSectionType = "reading" | "listening" | "writing" | "speaking";
export type MockSessionStatus =
  "in_progress" | "submitted" | "completed" | "abandoned";
export type MockRunnerContext = {
  mockTestSlug: string;
  sessionId: string;
  sectionAttemptId: string;
};

const sectionLabels: Record<MockSectionType, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
};

export function formatMockSectionType(value: MockSectionType) {
  return sectionLabels[value];
}

export function formatMockDuration(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} phút`;
}

export function formatMockSessionStatus(status: MockSessionStatus) {
  if (status === "completed") return "Đã hoàn thành";
  if (status === "submitted") return "Đang tạo tổng kết";
  if (status === "abandoned") return "Đã dừng";
  return "Đang làm";
}
