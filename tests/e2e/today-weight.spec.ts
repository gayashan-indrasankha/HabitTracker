import { expect, test } from '@playwright/test';

test('Today records and updates one daily weight measurement', async ({ page }) => {
  test.setTimeout(180_000);
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');

  await page.goto('/register');
  await page.getByLabel('Your name').fill('Weight Tester');
  await page.getByLabel('Email address').fill(`weight-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Weight-test-password-42');
  await page.getByLabel('Confirm password').fill('Weight-test-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/today');
  const weight = page.locator('#today-weight');
  await expect(weight.getByRole('heading', { name: 'Today’s weight' })).toBeVisible();
  await weight.getByLabel('Weight (kg)').fill('70.5');
  await weight.getByRole('button', { name: 'Save weight' }).click();
  await expect(weight).toContainText('Recorded today: 70.5 kg');
  await expect(weight.getByRole('button', { name: 'Update weight' })).toBeVisible();

  await page.goto('/dashboard');
  const homeWeight = page.getByRole('region', { name: 'Weight over time' });
  await expect(homeWeight).toContainText('70.5 kg');
  await expect(homeWeight).toContainText('Add another measurement on a different day');
  await expect(homeWeight.getByRole('img')).toHaveCount(0);
  await page.goto('/today');

  await weight.getByLabel('Weight (kg)').fill('70.2');
  await weight.getByRole('button', { name: 'Update weight' }).click();
  await expect(weight).toContainText('Recorded today: 70.2 kg');
  await page.reload();
  await expect(weight.getByLabel('Weight (kg)')).toHaveValue('70.2');

  await page.goto('/dashboard');
  await expect(page.locator('#home-weight')).toContainText('70.2 kg');
});
