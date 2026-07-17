import { expect, test, type Page, type TestInfo } from "@playwright/test";

const email = process.env.E2E_LEARNING_EMAIL;
const password = process.env.E2E_LEARNING_PASSWORD;
const expectedProjectRef = process.env.E2E_EXPECTED_SUPABASE_PROJECT_REF;
const activeProjectRef = process.env.E2E_ACTIVE_SUPABASE_PROJECT_REF;
const hasVerifiedEnvironment = Boolean(
  expectedProjectRef &&
  activeProjectRef &&
  expectedProjectRef === activeProjectRef,
);

function requireLearningEnvironment(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "Persisted learning E2E runs once in the desktop project.",
  );
  test.skip(
    !email || !password,
    "E2E_LEARNING_EMAIL and E2E_LEARNING_PASSWORD were not provided.",
  );
  test.skip(
    !hasVerifiedEnvironment,
    "Learning E2E requires an expected Supabase project ref matching the active environment.",
  );
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
}

test("published learning content, resume and completion persist", async ({
  page,
}, testInfo) => {
  requireLearningEnvironment(testInfo);
  await login(page);
  test.skip(
    new URL(page.url()).pathname === "/onboarding",
    "The dedicated learning account has not completed onboarding.",
  );

  await page.goto("/learn");
  await expect(
    page.getByRole("heading", { name: "Thư viện học", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Nền tảng IELTS" }),
  ).toBeVisible();

  const readingModule = page.getByRole("link", {
    name: "Nền tảng Reading",
  });
  if (await readingModule.isVisible()) {
    await readingModule.click();
    await expect(page.getByText("Ghi chú khi đọc")).toHaveCount(0);
  }

  await page.goto("/learn/ielts-foundations/hieu-cau-truc-bai-thi");
  await expect(
    page.getByRole("heading", { name: "Hiểu cấu trúc bài thi IELTS" }),
  ).toBeVisible();

  const sectionNames = [
    "Bốn kỹ năng, bốn loại bằng chứng",
    "Kiểm tra trước khi học",
    "Điều cần nhớ",
  ];

  for (const [index, sectionName] of sectionNames.entries()) {
    await page
      .getByRole("navigation", { name: "Các phần trong bài học" })
      .getByRole("link", { name: new RegExp(sectionName) })
      .click();
    await expect(page).toHaveURL(new RegExp(`section=${index + 1}`));

    const completeButton = page.getByRole("button", {
      name: "Đánh dấu đã hoàn thành",
    });
    const completedLink = page
      .getByRole("navigation", { name: "Các phần trong bài học" })
      .getByRole("link", { name: new RegExp(`Đã hoàn thành ${sectionName}`) });
    await expect(completeButton.or(completedLink)).toBeVisible();
    if (await completeButton.isVisible()) {
      await completeButton.click();
      await expect(completedLink).toBeVisible();
    }
  }

  await page.reload();
  await expect(
    page
      .getByRole("navigation", { name: "Các phần trong bài học" })
      .getByRole("link", { name: /Điều cần nhớ/ }),
  ).toHaveAttribute("aria-current", "step");
  await expect(
    page.getByRole("heading", {
      name: "Bạn đã hoàn thành tất cả phần bắt buộc.",
    }),
  ).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText("Hoàn thành").first()).toBeVisible();
  await page.goto("/progress");
  await expect(
    page.getByRole("heading", { name: "Hoạt động gần đây" }),
  ).toBeVisible();
  await expect(page.getByText("Hiểu cấu trúc bài thi IELTS")).toBeVisible();
});
