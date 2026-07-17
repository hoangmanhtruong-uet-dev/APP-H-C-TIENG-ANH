import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const userAEmail = process.env.E2E_MOCK_USER_A_EMAIL;
const userAPassword = process.env.E2E_MOCK_USER_A_PASSWORD;
const userBEmail = process.env.E2E_MOCK_USER_B_EMAIL;
const userBPassword = process.env.E2E_MOCK_USER_B_PASSWORD;
const expectedProjectRef = process.env.E2E_EXPECTED_SUPABASE_PROJECT_REF;
const activeProjectRef = process.env.E2E_ACTIVE_SUPABASE_PROJECT_REF;

function requireMockEnvironment(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "Persisted Phase 10A mutation runs once on desktop.",
  );
  test.skip(
    !userAEmail || !userAPassword || !userBEmail || !userBPassword,
    "Two dedicated completed-onboarding Phase 10A accounts were not provided.",
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

test("published catalog, pinned session, sequential first section and owner isolation", async ({
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  requireMockEnvironment(testInfo);

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await login(pageA, userAEmail!, userAPassword!);
  await pageA.goto("/mock-tests");
  await expect(
    pageA.getByRole("heading", { name: "Mock tests" }),
  ).toBeVisible();
  await expect(
    pageA.getByRole("heading", { name: "Academic foundation mock test" }),
  ).toBeVisible();
  await expect(pageA.getByText("Editorial draft mock test")).toHaveCount(0);

  await pageA
    .getByRole("link", { name: /Xem cấu trúc|Tiếp tục mock test/ })
    .click();
  await expect(pageA).toHaveURL(/\/mock-tests\/academic-foundation-mock$/);
  const start = pageA.getByRole("button", { name: /Bắt đầu mock test/ });
  const resume = pageA.getByRole("link", { name: /^Tiếp tục/ });
  await expect(start.or(resume)).toBeVisible();
  if (await start.isVisible()) await start.click();
  else await resume.click();
  await expect(pageA).toHaveURL(
    /\/mock-tests\/academic-foundation-mock\/session\/[0-9a-f-]+$/,
  );
  const sessionPath = new URL(pageA.url()).pathname;
  await expect(pageA.getByText("Chưa mở")).toHaveCount(3);
  const openSection = pageA.getByRole("button", { name: /Mở section/ });
  const continueSection = pageA.getByRole("link", { name: /^Tiếp tục/ });
  await expect(openSection.or(continueSection)).toBeVisible();
  if (await openSection.isVisible()) await openSection.click();
  else await continueSection.click();
  await expect(pageA).toHaveURL(
    /\/practice\/reading\/academic-reading-cool-roofs\?.*mockSessionId=/,
  );
  await expect(
    pageA.getByRole("heading", { name: "Cool roofs neighbourhood pilot" }),
  ).toBeVisible();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await login(pageB, userBEmail!, userBPassword!);
  await pageB.goto(sessionPath);
  await expect(
    pageB.getByRole("heading", { name: "Không tìm thấy trang" }),
  ).toBeVisible();
  await contextB.close();
  await contextA.close();
});

test("Phase 10A catalog and session are responsive and accessible", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  requireMockEnvironment(testInfo);
  await login(page, userAEmail!, userAPassword!);

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/mock-tests");
    await expect(page.locator("#main-content")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
      `/mock-tests at ${width}px`,
    ).toBe(false);
  }

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/mock-tests");
  const accessibility = await new AxeBuilder({ page })
    .include("#main-content")
    .analyze();
  expect(accessibility.violations).toEqual([]);
  const testLink = page.getByRole("link", { name: "Tiếp tục mock test" });
  await testLink.focus();
  await expect(testLink).toBeFocused();
});
