import { expect, test, type Page, type TestInfo } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const userAEmail = process.env.E2E_PRACTICE_USER_A_EMAIL;
const userAPassword = process.env.E2E_PRACTICE_USER_A_PASSWORD;
const userBEmail = process.env.E2E_PRACTICE_USER_B_EMAIL;
const userBPassword = process.env.E2E_PRACTICE_USER_B_PASSWORD;
const expectedProjectRef = process.env.E2E_EXPECTED_SUPABASE_PROJECT_REF;
const activeProjectRef = process.env.E2E_ACTIVE_SUPABASE_PROJECT_REF;

function requirePracticeEnvironment(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "Persisted mutation runs once on desktop.",
  );
  test.skip(
    !userAEmail || !userAPassword || !userBEmail || !userBPassword,
    "Two dedicated completed-onboarding Phase 5 accounts were not provided.",
  );
  test.skip(
    !expectedProjectRef || expectedProjectRef !== activeProjectRef,
    "Expected Supabase project ref must match the active environment.",
  );
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
  test.skip(
    new URL(page.url()).pathname === "/onboarding",
    "Dedicated account has not completed onboarding.",
  );
}

test("published content, resume, deterministic submit and owner isolation", async ({
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  requirePracticeEnvironment(testInfo);
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await login(pageA, userAEmail!, userAPassword!);

  await pageA.goto("/learn/vocabulary");
  await expect(
    pageA.getByRole("heading", { name: "Vocabulary nền tảng" }),
  ).toBeVisible();
  await expect(
    pageA.getByText("mitigate", { exact: true }).first(),
  ).toBeVisible();
  await pageA.goto("/practice/draft-content-review");
  await expect(
    pageA.getByRole("heading", { name: "Không tìm thấy trang" }),
  ).toBeVisible();

  await pageA.goto("/practice/academic-vocabulary-foundations");
  const startButton = pageA.getByRole("button", { name: "Bắt đầu bài tập" });
  const firstAnswer = pageA.getByRole("radio", {
    name: "To make a harmful effect less severe",
  });
  await expect(startButton.or(firstAnswer)).toBeVisible();
  if (await startButton.isVisible()) await startButton.click();

  await firstAnswer.check();
  await pageA.getByRole("button", { name: "Lưu và sang câu tiếp" }).click();
  await expect(pageA).toHaveURL(/question=2/);
  await pageA.reload();
  await expect(
    pageA.getByRole("link", { name: "Câu 1, đã lưu" }),
  ).toBeVisible();

  await pageA.getByRole("checkbox", { name: "coherent" }).check();
  await pageA.getByRole("checkbox", { name: "compelling" }).check();
  await pageA.getByRole("button", { name: "Lưu và sang câu tiếp" }).click();
  await pageA.getByRole("radio", { name: "True" }).check();
  await pageA.getByRole("button", { name: "Lưu và sang câu tiếp" }).click();
  await pageA.getByLabel("Câu trả lời").fill("mitigate");
  await pageA.getByRole("button", { name: "Lưu câu cuối" }).click();
  pageA.once("dialog", (dialog) => dialog.accept());
  await pageA.getByRole("button", { name: "Nộp bài" }).click();

  await expect(pageA.getByText("5/5")).toBeVisible();
  await expect(
    pageA.getByRole("heading", { name: "Review từng câu" }),
  ).toBeVisible();
  const resultPath = new URL(pageA.url()).pathname;
  await pageA.goto("/progress");
  await expect(
    pageA.getByRole("heading", { name: "Lịch sử luyện tập" }),
  ).toBeVisible();
  await expect(
    pageA
      .getByRole("link", { name: "Academic Vocabulary Foundations" })
      .first(),
  ).toBeVisible();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await login(pageB, userBEmail!, userBPassword!);
  await pageB.goto(resultPath);
  await expect(
    pageB.getByRole("heading", { name: "Không tìm thấy trang" }),
  ).toBeVisible();
  await contextB.close();
  await contextA.close();
});

test("Phase 5 routes remain responsive and keyboard reachable", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  requirePracticeEnvironment(testInfo);
  await login(page, userAEmail!, userAPassword!);

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/learn/vocabulary",
      "/learn/grammar",
      "/practice/academic-vocabulary-foundations",
      "/progress",
    ]) {
      await page.goto(path);
      await expect(page.locator("#main-content")).toBeVisible();
      const hasHorizontalOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(hasHorizontalOverflow, `${path} at ${width}px`).toBe(false);
    }
  }

  await page.goto("/learn/vocabulary");
  const vocabularyLink = page.getByRole("link", { name: "Học từ này" }).first();
  await vocabularyLink.focus();
  await expect(vocabularyLink).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Vocabulary nền tảng" }),
  ).toBeVisible();
  await page.goto("/practice/academic-vocabulary-foundations");
  await expect(
    page.getByRole("heading", { name: "Academic Vocabulary Foundations" }),
  ).toBeVisible();
});
