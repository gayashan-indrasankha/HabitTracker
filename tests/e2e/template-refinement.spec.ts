import { expect, test } from '@playwright/test';

test('new template keeps Sunday lighter and reapplying preserves saved sessions', async ({
  page,
}) => {
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Template Refinement');
  await page.getByLabel('Email address').fill(`template-refinement-${tag}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Template-refinement-password-42');
  await page.getByLabel('Confirm password').fill('Template-refinement-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/settings/life-os');
  for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.uncheck();
  for (const section of ['career', 'interview', 'english'])
    await page.locator(`input[name="section"][value="${section}"]`).check();
  await page.getByRole('button', { name: 'Apply selected sections' }).click();
  await expect(page.getByRole('status')).toContainText('Selected sections are ready');

  await page.goto('/week?date=2026-10-11');
  await expect(page.getByRole('heading', { name: 'Mock interview', level: 3 })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Apply DevOps learning', level: 3 })).toHaveCount(
    2,
  );
  await expect(
    page.getByRole('heading', { name: 'Explain a technical topic aloud', level: 3 }),
  ).toHaveCount(1);

  await page.goto('/settings/life-os');
  for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.uncheck();
  for (const section of ['career', 'interview', 'english'])
    await page.locator(`input[name="section"][value="${section}"]`).check();
  await page.getByRole('button', { name: 'Apply selected sections' }).click();
  await expect(page.getByRole('status')).toContainText('Selected sections are ready');
  await page.goto('/week?date=2026-10-11');
  await expect(page.getByRole('heading', { name: 'Mock interview', level: 3 })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Apply DevOps learning', level: 3 })).toHaveCount(
    2,
  );
});
