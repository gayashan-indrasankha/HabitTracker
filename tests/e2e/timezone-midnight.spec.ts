import { expect, test } from '@playwright/test';

test('the local calendar day is eligible when UTC is still yesterday', async ({ page }) => {
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const instant = new Date(process.env.HABITFLOW_TEST_NOW ?? '2026-10-08T12:30:00Z');
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  const today = `${value('year')}-${value('month')}-${value('day')}`;
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const futureDate = tomorrow.toISOString().slice(0, 10);
  const habit = `Midnight habit ${Date.now()}`;

  await page.goto('/register');
  await page.getByLabel('Your name').fill('Midnight Tester');
  await page.getByLabel('Email address').fill(`midnight-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Midnight-test-password-42');
  await page.getByLabel('Confirm password').fill('Midnight-test-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/habits/new');
  await expect(page.getByLabel('Start Date')).toHaveValue(today);
  await page.getByLabel(/Habit Name/).fill(habit);
  await page.getByLabel(/Monthly Target/).fill('1');
  await page.getByLabel('Start Date').fill('2026-10-01');
  await page.getByRole('button', { name: 'Save Habit' }).click();
  await expect(page).toHaveURL(/\/habits$/);

  await page.goto('/dashboard?month=2026-10');
  await expect(page.locator(`thead th[title="${today}"]`)).toHaveClass(/text-primary/);
  const row = page.getByRole('row', { name: new RegExp(habit) });
  const todayButton = row.getByRole('button', { name: `Mark complete for ${habit} on ${today}` });
  await expect(todayButton).toBeEnabled();
  await expect(
    row.getByRole('button', { name: `Mark complete for ${habit} on ${futureDate}` }),
  ).toBeDisabled();
  await todayButton.click();
  await expect(row).toContainText('1 / 1');
  await page.reload();
  await expect(page.getByRole('row', { name: new RegExp(habit) })).toContainText('1 / 1');
});
