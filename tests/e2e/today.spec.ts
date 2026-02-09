import { test, expect } from "@playwright/test";

test("login -> today -> submit -> refresh stays same day", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForURL("**/today");
  await expect(page.getByText("Today Questionnaire")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("dayIndex")).toBeVisible({ timeout: 30000 });

  const dateKeyText = await page.getByTestId("dateKey").innerText();
  const dayIndexText = await page.getByTestId("dayIndex").innerText();

  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Submitted")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("dayIndex")).toBeVisible();

  const dateKeyText2 = await page.getByTestId("dateKey").innerText();
  const dayIndexText2 = await page.getByTestId("dayIndex").innerText();

  expect(dateKeyText2).toBe(dateKeyText);
  expect(dayIndexText2).toBe(dayIndexText);
});
