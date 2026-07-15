type SupabaseLikeError = {
  code?: string;
  message?: string;
  status?: number;
};

const authMessages: Record<string, string> = {
  invalid_credentials: "Email hoặc mật khẩu chưa đúng.",
  email_not_confirmed: "Hãy xác minh email trước khi đăng nhập.",
  weak_password: "Mật khẩu chưa đáp ứng yêu cầu bảo mật.",
  over_email_send_rate_limit:
    "Đã gửi quá nhiều email. Hãy đợi một lúc rồi thử lại.",
  over_request_rate_limit: "Có quá nhiều yêu cầu. Hãy đợi một lúc rồi thử lại.",
  signup_disabled: "Đăng ký tài khoản đang tạm đóng.",
  validation_failed: "Thông tin xác thực chưa hợp lệ.",
};

export function mapAuthError(error: SupabaseLikeError | null | undefined) {
  if (!error) return "Không thể hoàn tất yêu cầu xác thực.";
  if (error.code && authMessages[error.code]) return authMessages[error.code];
  if (error.status === 429) {
    return "Có quá nhiều yêu cầu. Hãy đợi một lúc rồi thử lại.";
  }
  if (!error.status) {
    return "Không thể kết nối dịch vụ xác thực. Hãy kiểm tra mạng và thử lại.";
  }
  return "Dịch vụ xác thực đang gặp sự cố. Hãy thử lại sau.";
}

export function getConfirmationMessage(code: string | undefined) {
  if (code === "confirmation_invalid") {
    return "Liên kết xác minh không hợp lệ, đã hết hạn hoặc đã được sử dụng.";
  }
  if (code === "session_expired") {
    return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.";
  }
  return undefined;
}
