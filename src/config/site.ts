export const siteConfig = {
  name: "IELTS Flow",
  description:
    "Nền tảng tự học IELTS có lộ trình, phản hồi và vòng lặp ôn tập rõ ràng.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com",
} as const;
