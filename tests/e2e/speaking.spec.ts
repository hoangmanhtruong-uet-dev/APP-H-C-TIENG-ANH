import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const userAEmail = process.env.E2E_PRACTICE_USER_A_EMAIL;
const userAPassword = process.env.E2E_PRACTICE_USER_A_PASSWORD;
const userBEmail = process.env.E2E_PRACTICE_USER_B_EMAIL;
const userBPassword = process.env.E2E_PRACTICE_USER_B_PASSWORD;
const expectedProjectRef = process.env.E2E_EXPECTED_SUPABASE_PROJECT_REF;
const activeProjectRef = process.env.E2E_ACTIVE_SUPABASE_PROJECT_REF;

function requireEnvironment(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "Persisted microphone mutation runs once on desktop.",
  );
  test.skip(
    !userAEmail || !userAPassword || !userBEmail || !userBPassword,
    "Two dedicated completed-onboarding accounts are required.",
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

test("Speaking private recording, verified submit, progress and owner isolation", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  requireEnvironment(testInfo);
  const contextA = await browser.newContext({ permissions: ["microphone"] });
  const pageA = await contextA.newPage();
  await login(pageA, userAEmail!, userAPassword!);

  await pageA.goto("/practice/speaking");
  await expect(
    pageA.getByRole("heading", { name: "Everyday choices" }),
  ).toBeVisible();
  await expect(pageA.getByText("Neighbourhood ideas")).toHaveCount(0);
  await pageA.goto("/practice/speaking/neighbourhood-ideas-draft");
  await expect(
    pageA.getByRole("heading", { name: "Không tìm thấy trang" }),
  ).toBeVisible();

  await pageA.goto("/practice/speaking/everyday-choices");
  const start = pageA.getByRole("button", { name: "Bắt đầu ghi âm" });
  const runner = pageA.getByText(/câu bắt buộc đã có audio/);
  await expect(start.or(runner)).toBeVisible();
  if (await start.isVisible()) await start.click();
  await expect(runner).toBeVisible();

  const promptCards = pageA.locator("#main-content ol > li");
  await expect(promptCards).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    const card = promptCards.nth(index);
    await card.getByRole("button", { name: "Ghi âm" }).click();
    await pageA.waitForTimeout(1400);
    await card.getByRole("button", { name: "Dừng ghi" }).click();
    await expect(
      card.getByRole("button", { name: "Upload và xác minh" }),
    ).toBeEnabled();
    await card.getByRole("button", { name: "Upload và xác minh" }).click();
    await expect(
      pageA.getByText("Audio đã được PostgreSQL xác nhận."),
    ).toBeVisible({
      timeout: 20_000,
    });
    await expect(card.getByText(/Đã xác minh/)).toBeVisible();
  }

  await pageA.getByRole("button", { name: "Nộp attempt bất biến" }).click();
  await pageA
    .getByRole("button", { name: "Xác nhận nộp bài", exact: true })
    .click();
  await expect(pageA).toHaveURL(
    /\/practice\/speaking\/everyday-choices\/attempt\//,
  );
  await expect(pageA.getByText("Attempt đã nộp · bất biến")).toBeVisible();
  await expect(
    pageA.getByText(/Chưa có transcript thật/).first(),
  ).toBeVisible();
  const reviewPath = new URL(pageA.url()).pathname;

  await pageA.goto("/progress");
  await expect(
    pageA.getByRole("heading", { name: "Hoạt động gần đây" }),
  ).toBeVisible();
  await expect(
    pageA.getByRole("link", { name: "Everyday choices" }).first(),
  ).toBeVisible();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await login(pageB, userBEmail!, userBPassword!);
  await pageB.goto(reviewPath);
  await expect(
    pageB.getByRole("heading", { name: "Không tìm thấy trang" }),
  ).toBeVisible();
  await contextB.close();
  await contextA.close();
});

test("Speaking routes are responsive, keyboard reachable and axe-clean", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  requireEnvironment(testInfo);
  await login(page, userAEmail!, userAPassword!);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/practice/speaking",
      "/practice/speaking/everyday-choices",
      "/progress",
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
  await page.goto("/practice/speaking");
  const firstLink = page.getByRole("link", { name: /bài luyện/i }).first();
  await firstLink.focus();
  await expect(firstLink).toBeFocused();
  const accessibility = await new AxeBuilder({ page })
    .include("#main-content")
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
