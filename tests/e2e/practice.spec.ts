import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
    pageA.getByRole("heading", { name: "Hoạt động gần đây" }),
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

test("Reading autosave, resume, submit, review and owner isolation", async ({
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  requirePracticeEnvironment(testInfo);
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await login(pageA, userAEmail!, userAPassword!);

  await pageA.goto("/practice/reading");
  await expect(
    pageA.getByRole("heading", { name: "Reading practice" }),
  ).toBeVisible();
  await expect(
    pageA.getByRole("heading", { name: "Cool roofs neighbourhood pilot" }),
  ).toBeVisible();
  await pageA.goto(
    "/practice/reading/draft-academic-reading-river-restoration",
  );
  await expect(pageA.getByRole("region")).toBeVisible();
  await expect(pageA.getByText("Draft river restoration notes")).toHaveCount(0);

  await pageA.goto("/practice/reading/academic-reading-cool-roofs");
  const start = pageA.getByRole("button", { name: "Bắt đầu làm bài" });
  const firstQuestion = pageA.locator("fieldset").filter({
    hasText: "What is the main purpose of paragraph B?",
  });
  await expect(start.or(firstQuestion)).toBeVisible();
  if (await start.isVisible()) await start.click();

  await firstQuestion
    .getByRole("checkbox", {
      name: "To describe how the neighbourhood comparison was organised",
    })
    .check();
  await expect(pageA.getByRole("status")).toContainText("PostgreSQL");
  await pageA.reload();
  await expect(
    firstQuestion.getByRole("checkbox", {
      name: "To describe how the neighbourhood comparison was organised",
    }),
  ).toBeChecked();
  await expect(pageA.getByLabel(/Thời gian còn lại/)).toBeVisible();

  await pageA.getByRole("button", { name: "Nộp và xem kết quả" }).click();
  await pageA
    .getByRole("button", { name: "Xác nhận nộp bài", exact: true })
    .click();
  await expect(pageA).toHaveURL(
    /\/practice\/reading\/academic-reading-cool-roofs\/result\//,
  );
  await expect(
    pageA.getByRole("heading", { name: "Review từng câu" }),
  ).toBeVisible();
  await expect(
    pageA.getByText(/Điểm và trạng thái thời gian do PostgreSQL/),
  ).toBeVisible();
  const resultPath = new URL(pageA.url()).pathname;
  await pageA.goto("/progress");
  await expect(
    pageA.getByText("Reading", { exact: true }).first(),
  ).toBeVisible();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await login(pageB, userBEmail!, userBPassword!);
  await pageB.goto(resultPath);
  await expect(pageB.getByRole("region")).toBeVisible();
  await expect(
    pageB.getByRole("heading", { name: "Review từng câu" }),
  ).toHaveCount(0);
  await contextB.close();
  await contextA.close();
});

test("Reading layout has no horizontal overflow at target viewports", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  requirePracticeEnvironment(testInfo);
  await login(page, userAEmail!, userAPassword!);
  await page.goto("/practice/reading/academic-reading-cool-roofs");
  const start = page.locator("#main-content form button[type=submit]").first();
  const runner = page.locator("main[aria-label]");
  await expect(start.or(runner)).toBeVisible();
  if (await start.isVisible()) await start.click();
  await expect(runner).toBeVisible();

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/practice/reading",
      "/practice/reading/academic-reading-cool-roofs",
    ]) {
      await page.goto(path);
      await expect(page.locator("#main-content")).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        ),
        `${path} at ${width}px`,
      ).toBe(false);
    }
  }

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/practice/reading/academic-reading-cool-roofs");
  const questions = page.locator("button[aria-pressed]").nth(1);
  await expect(questions).toBeVisible();
  await questions.focus();
  await expect(questions).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(questions).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("main[aria-label]")).toBeVisible();
});

test("Listening audio, autosave, submit, transcript and owner isolation", async ({
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  requirePracticeEnvironment(testInfo);
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await login(pageA, userAEmail!, userAPassword!);

  await pageA.goto("/practice/listening");
  await expect(
    pageA.getByRole("heading", { name: "Listening practice" }),
  ).toBeVisible();
  await expect(
    pageA.getByRole("heading", { name: "Community library visit" }),
  ).toBeVisible();
  await pageA.goto("/practice/listening/draft-academic-listening-campus-tour");
  await expect(pageA.getByRole("region")).toBeVisible();
  await expect(pageA.getByText("Draft campus tour fixture")).toHaveCount(0);

  await pageA.goto("/practice/listening/academic-listening-community-library");
  const start = pageA.getByRole("button", { name: "Bắt đầu làm bài" });
  const firstQuestion = pageA
    .locator("fieldset")
    .filter({ hasText: "What time does the library open" });
  await expect(start.or(firstQuestion)).toBeVisible();
  if (await start.isVisible()) await start.click();

  const audio = pageA.locator("audio");
  await expect(audio).toBeVisible();
  await expect(audio.locator("source")).toHaveAttribute(
    "src",
    /community-library-visit\.wav$/,
  );
  await firstQuestion.getByRole("radio", { name: "9:30" }).check();
  await expect(pageA.getByRole("status")).toContainText("PostgreSQL");
  await pageA.reload();
  await expect(
    firstQuestion.getByRole("radio", { name: "9:30" }),
  ).toBeChecked();
  await expect(pageA.getByLabel(/Thời gian còn lại/)).toBeVisible();
  await expect(pageA.getByText("Transcript")).toHaveCount(0);

  await pageA.getByRole("button", { name: "Nộp và xem kết quả" }).click();
  await pageA
    .getByRole("button", { name: "Xác nhận nộp bài", exact: true })
    .click();
  await expect(pageA).toHaveURL(
    /\/practice\/listening\/academic-listening-community-library\/result\//,
  );
  await expect(
    pageA.getByRole("heading", { name: "Review từng câu" }),
  ).toBeVisible();
  await expect(
    pageA.getByRole("heading", { name: "Transcript" }),
  ).toBeVisible();
  const resultPath = new URL(pageA.url()).pathname;
  await pageA.goto("/progress");
  await expect(
    pageA.getByText("Listening", { exact: true }).first(),
  ).toBeVisible();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await login(pageB, userBEmail!, userBPassword!);
  await pageB.goto(resultPath);
  await expect(pageB.getByRole("region")).toBeVisible();
  await expect(pageB.getByRole("heading", { name: "Transcript" })).toHaveCount(
    0,
  );
  await contextB.close();
  await contextA.close();
});

test("Listening routes are responsive and keyboard reachable", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  requirePracticeEnvironment(testInfo);
  await login(page, userAEmail!, userAPassword!);
  await page.goto("/practice/listening/academic-listening-community-library");
  const start = page.locator("#main-content form button[type=submit]").first();
  const runner = page.locator("main[aria-label='Câu hỏi Listening']");
  await expect(start.or(runner)).toBeVisible();
  if (await start.isVisible()) await start.click();
  await expect(runner).toBeVisible();

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/practice/listening",
      "/practice/listening/academic-listening-community-library",
    ]) {
      await page.goto(path);
      await expect(page.locator("#main-content")).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        ),
        `${path} at ${width}px`,
      ).toBe(false);
    }
  }

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/practice/listening/academic-listening-community-library");
  const firstNav = page.getByRole("link", { name: /Câu 1,/ });
  await firstNav.focus();
  await expect(firstNav).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("fieldset").first()).toBeInViewport();
});

test("Writing autosave, immutable submit, review and owner isolation", async ({
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  requirePracticeEnvironment(testInfo);
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await login(pageA, userAEmail!, userAPassword!);

  await pageA.goto("/practice/writing");
  await expect(
    pageA.getByRole("heading", { name: "Writing practice" }),
  ).toBeVisible();
  await expect(
    pageA.getByRole("heading", { name: "Community green spaces" }),
  ).toBeVisible();
  await pageA.goto("/practice/writing/flexible-library-hours");
  await expect(
    pageA.getByRole("heading", { name: "Không tìm thấy trang" }),
  ).toBeVisible();

  await pageA.goto("/practice/writing/community-green-spaces");
  const start = pageA.getByRole("button", { name: "Bắt đầu viết" });
  const editor = pageA.getByLabel("Bài viết của bạn");
  await expect(start.or(editor)).toBeVisible();
  if (await start.isVisible()) await start.click();

  const essay =
    "Urban green spaces can improve daily life when towns plan them carefully. This practice essay explains a clear position and provides a local example. Housing remains important, but shared parks can support health, shade, and community contact. Public consultation can help a town balance these needs before it chooses how to use unused land.";
  await editor.fill(essay);
  await expect(pageA.getByRole("status")).toContainText(
    "Đã lưu vào PostgreSQL",
  );
  await pageA.reload();
  await expect(editor).toHaveValue(essay);
  await expect(pageA.getByLabel(/giây còn lại theo máy chủ/)).toBeVisible();

  await pageA.getByRole("button", { name: "Nộp bài và khóa nội dung" }).click();
  await pageA
    .getByRole("button", { name: "Xác nhận nộp bài", exact: true })
    .click();
  await expect(pageA).toHaveURL(
    /\/practice\/writing\/community-green-spaces\/submission\//,
  );
  await expect(
    pageA.getByRole("heading", { name: "Bài đã nộp" }),
  ).toBeVisible();
  await expect(pageA.getByText(essay)).toBeVisible();
  await expect(
    pageA.getByText(/không phải điểm IELTS chính thức/i),
  ).toBeVisible();
  const reviewPath = new URL(pageA.url()).pathname;

  await pageA.goto("/progress");
  await expect(
    pageA.getByRole("heading", { name: "Hoạt động gần đây" }),
  ).toBeVisible();
  await expect(
    pageA.getByRole("link", { name: "Community green spaces" }).first(),
  ).toBeVisible();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await login(pageB, userBEmail!, userBPassword!);
  await pageB.goto(reviewPath);
  await expect(
    pageB.getByRole("heading", { name: "Không tìm thấy trang" }),
  ).toBeVisible();
  await expect(pageB.getByText(essay)).toHaveCount(0);
  await contextB.close();
  await contextA.close();
});

test("Writing routes are responsive and keyboard reachable", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  requirePracticeEnvironment(testInfo);
  await login(page, userAEmail!, userAPassword!);
  await page.goto("/practice/writing/community-green-spaces");
  const start = page.getByRole("button", { name: "Bắt đầu viết" });
  const editor = page.getByLabel("Bài viết của bạn");
  await expect(start.or(editor)).toBeVisible();
  if (await start.isVisible()) await start.click();

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/practice/writing",
      "/practice/writing/community-green-spaces",
    ]) {
      await page.goto(path);
      await expect(page.locator("#main-content")).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        ),
        `${path} at ${width}px`,
      ).toBe(false);
    }
  }

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/practice/writing/community-green-spaces");
  await page.waitForLoadState("networkidle");
  await editor.focus();
  await expect(editor).toBeFocused();
  const accessibility = await new AxeBuilder({ page })
    .include("#main-content")
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.keyboard.type(" Keyboard accessible.");
  await expect(editor).toHaveValue(/Keyboard accessible\.$/);
});
