import { expect, test } from '@playwright/test';

test.beforeEach(() => {
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
});

test('optional meal plan can be edited, logged, cleared, paused, and resumed', async ({ page }) => {
  await page.goto('/register');
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await page.getByLabel('Your name').fill('Nutrition Refinement');
  await page.getByLabel('Email address').fill(`nutrition-${tag}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Nutrition-password-42');
  await page.getByLabel('Confirm password').fill('Nutrition-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/settings');
  const section = page.getByRole('heading', { name: 'Optional meal checklist' }).locator('..');
  await section.getByRole('button', { name: 'Enable checklist' }).click();
  await section.getByText('Edit meal plan').click();
  await section.getByLabel('Meal name').fill('Breakfast');
  await section.getByLabel('Food/portion notes (optional)').fill('My existing meal plan');
  await section.getByLabel('Planned kcal (optional)').fill('500');
  await section.getByRole('button', { name: 'Add meal' }).click();
  await expect(section.getByText('Meal plan saved.')).toBeVisible();
  const edit = section
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save meal' }) });
  if (!(await edit.isVisible())) await section.getByText('Edit meal plan').click();
  await edit.getByLabel('Meal name').fill('Morning meal');
  await edit.getByRole('button', { name: 'Save meal' }).click();

  await page.goto('/today');
  await page.getByText('Nutrition checklist').click();
  await expect(page.getByText('Morning meal')).toBeVisible();
  await expect(page.getByText(/Actual intake is not calculated/)).toBeVisible();
  const group = page.getByRole('group', { name: /Morning meal status/ });
  await group.getByRole('button', { name: 'Followed', exact: true }).click();
  await expect(group.getByRole('button', { name: 'Followed', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await group.getByRole('button', { name: 'Not recorded' }).click();
  await expect(group.getByRole('button', { name: 'Not recorded' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await group.getByRole('button', { name: 'Not followed' }).click();
  await expect(group.getByRole('button', { name: 'Not followed' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByLabel('Log date').fill('2026-10-07');
  await page.getByRole('button', { name: 'View date' }).click();
  await expect(page).toHaveURL(/mealDate=2026-10-07/);
  await page.getByText('Nutrition checklist').click();
  await page
    .getByRole('group', { name: /Morning meal status/ })
    .getByRole('button', { name: 'Followed', exact: true })
    .click();

  await page.goto('/settings');
  await section.getByRole('button', { name: 'Pause checklist' }).click();
  await page.goto('/today');
  await expect(page.getByText('Nutrition checklist')).toHaveCount(0);
  await page.goto('/settings');
  await section.getByRole('button', { name: 'Enable checklist' }).click();
  await page.goto('/today?mealDate=2026-10-07');
  await page.getByText('Nutrition checklist').click();
  await expect(
    page
      .getByRole('group', { name: /Morning meal status/ })
      .getByRole('button', { name: 'Followed', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('meal templates and logs remain private to their account', async ({ page, browser }) => {
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Meal Owner');
  await page.getByLabel('Email address').fill(`meal-owner-${tag}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Meal-owner-password-42');
  await page.getByLabel('Confirm password').fill('Meal-owner-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto('/settings');
  const ownerSettings = page
    .getByRole('heading', { name: 'Optional meal checklist' })
    .locator('..');
  await ownerSettings.getByRole('button', { name: 'Enable checklist' }).click();
  await ownerSettings.getByText('Edit meal plan').click();
  await ownerSettings.getByLabel('Meal name').fill('Private meal');
  await ownerSettings.getByRole('button', { name: 'Add meal' }).click();
  await expect(ownerSettings.getByText('Meal plan saved.')).toBeVisible();
  await page.goto('/today');
  await page.getByText('Nutrition checklist').click();
  await page
    .getByRole('group', { name: /Private meal status/ })
    .getByRole('button', { name: 'Followed', exact: true })
    .click();

  const otherContext = await browser.newContext({ baseURL: 'http://localhost:3100' });
  try {
    const other = await otherContext.newPage();
    await other.goto('/register');
    await other.getByLabel('Your name').fill('Other Meal User');
    await other.getByLabel('Email address').fill(`other-meal-${tag}@example.test`);
    await other.getByLabel('Password', { exact: true }).fill('Other-meal-password-42');
    await other.getByLabel('Confirm password').fill('Other-meal-password-42');
    await other.getByRole('button', { name: 'Create account' }).click();
    await expect(other).toHaveURL(/\/dashboard/);
    await other.goto('/settings');
    const otherSettings = other
      .getByRole('heading', { name: 'Optional meal checklist' })
      .locator('..');
    await expect(otherSettings.getByText('Edit meal plan (0/5)')).toBeVisible();
    await otherSettings.getByRole('button', { name: 'Enable checklist' }).click();
    await other.goto('/today');
    await other.getByText('Nutrition checklist').click();
    await expect(other.getByText('Private meal')).toHaveCount(0);
    await expect(
      other.getByText('Add meals in Settings to start this optional checklist.'),
    ).toBeVisible();
  } finally {
    await otherContext.close();
  }
});
