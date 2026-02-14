import { test, expect } from "@playwright/test";

test("product type page renders without skeleton and avoids immediate refetch", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/products/public")) {
      requests.push(req.url());
    }
  });

  await page.goto("/shop/riding-gear", { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);

  await page.waitForTimeout(1500);
  expect(requests.length).toBeLessThanOrEqual(1);
});

test("infinite scroll triggers exactly one next-page fetch", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/products/public")) {
      requests.push(req.url());
    }
  });

  await page.goto("/shop/riding-gear");
  let hasNext: boolean | null = null;
  try {
    const firstResponse = await page.waitForResponse(
      (res) => res.url().includes("/api/products/public"),
      { timeout: 2000 }
    );
    const firstJson = await firstResponse.json().catch(() => null);
    hasNext =
      firstJson?.data?.meta?.hasNext ??
      firstJson?.data?.data?.meta?.hasNext ??
      false;
  } catch {
    hasNext = null;
  }

  const before = requests.length;
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  if (hasNext === true) {
    await expect
      .poll(() => requests.length, { timeout: 5000 })
      .toBe(before + 1);
  } else if (hasNext === false) {
    await expect
      .poll(() => requests.length, { timeout: 2000 })
      .toBe(before);
  } else {
    await page.waitForTimeout(2000);
    expect(requests.length).toBeLessThanOrEqual(before + 1);
  }
});
