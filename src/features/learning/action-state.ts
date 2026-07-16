export type LearningProgressActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  requestId?: string;
};

export const initialLearningProgressActionState: LearningProgressActionState = {
  status: "idle",
};

export function mapProgressError(
  errorCode: string | undefined,
  requestId: string,
): LearningProgressActionState {
  if (errorCode === "P0002" || errorCode === "23503") {
    return {
      status: "error",
      message: "Bài học hoặc phần học không còn khả dụng.",
      requestId,
    };
  }

  if (errorCode === "28000" || errorCode === "42501") {
    return {
      status: "error",
      message: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
      requestId,
    };
  }

  return {
    status: "error",
    message: "Không thể lưu tiến độ lúc này. Hãy thử lại.",
    requestId,
  };
}
