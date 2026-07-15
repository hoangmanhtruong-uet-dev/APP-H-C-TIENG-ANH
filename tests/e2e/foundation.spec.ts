import { expect, test } from "@playwright/test";

const routes = [
  ["/", "Biết rõ hôm nay cần học gì."],
  ["/login", "Đăng nhập"],
  ["/register", "Tạo tài khoản"],
  ["/dashboard", "Chào mừng đến không gian học"],
  ["/learn", "Học hôm nay"],
  ["/roadmap", "Lộ trình"],
  ["/progress", "Tiến độ"],
  ["/profile", "Hồ sơ"],
  ["/settings", "Cài đặt"],
] as const;

const requiredViewports = [
  { name: "phone-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page,
) {
  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

  expect(hasOverflow).toBe(false);
}

for (const [route, heading] of routes) {
  test(`${route} renders without horizontal overflow`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }).first(),
    ).toBeVisible();

    await expectNoHorizontalOverflow(page);
    expect(consoleErrors).toEqual([]);
  });
}

for (const viewport of requiredViewports) {
  test(`dashboard shell is responsive at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", {
        name: "Chào mừng đến không gian học",
        exact: true,
      }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    if (viewport.width < 1024) {
      await expect(
        page.getByRole("button", { name: "Mở điều hướng" }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole("navigation", { name: "Điều hướng học tập" }),
      ).toBeVisible();
    }

    await page.screenshot({
      path: `test-results/foundation-${viewport.name}.png`,
      fullPage: true,
    });
  });
}

test("mobile navigation opens and follows a route", async ({
  page,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Mobile navigation behavior only applies to the mobile project.",
  );

  await page.goto("/dashboard");
  const openNavigation = page.getByRole("button", { name: "Mở điều hướng" });
  await expect(openNavigation).toBeVisible();
  await expect(openNavigation).toBeEnabled();
  await openNavigation.click();
  const dialog = page.getByRole("dialog", { name: "Điều hướng học tập" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link", { name: "Lộ trình", exact: true }).click();
  await expect(page).toHaveURL(/\/roadmap$/);
});

test("not-found state gives a safe path home", async ({ page }) => {
  await page.goto("/route-khong-ton-tai");
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy trang" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Về trang chủ" }),
  ).toHaveAttribute("href", "/");
});

test("health endpoints return normalized envelopes", async ({ request }) => {
  const live = await request.get("/api/health/live");
  await expect(live).toBeOK();
  expect(live.headers()["cache-control"]).toContain("no-store");
  await expect(await live.json()).toMatchObject({
    data: {
      status: "ok",
    },
  });

  const ready = await request.get("/api/health/ready");
  expect(ready.headers()["cache-control"]).toContain("no-store");

  const body = await ready.json();
  if (ready.status() === 200) {
    expect(body).toMatchObject({
      data: {
        status: "ready",
      },
    });
  } else {
    expect(ready.status()).toBe(503);
    expect(body).toMatchObject({
      error: {
        code: "CONFIGURATION_ERROR",
      },
    });
  }
});
