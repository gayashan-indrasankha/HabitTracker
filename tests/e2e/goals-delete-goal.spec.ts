import { expect, test } from '@playwright/test';

test('a mistaken goal can be deleted in one click, while linked work stays protected', async ({
  page,
}) => {
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const tag = Date.now();
  const mistaken = `Mistaken goal ${tag}`;
  const linked = `Linked goal ${tag}`;

  await page.goto('/register');
  await page.getByLabel('Your name').fill('Goal deletion tester');
  await page.getByLabel('Email address').fill(`delete-goal-${tag}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Delete-goal-password-42');
  await page.getByLabel('Confirm password').fill('Delete-goal-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/goals?view=goals');
  await page.getByText('Add a goal').click();
  const addGoal = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Create goal' }) });
  for (const title of [mistaken, linked]) {
    await addGoal.getByLabel('Goal title').fill(title);
    await addGoal.getByRole('button', { name: 'Create goal' }).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  }

  const mistakenCard = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: mistaken }) })
    .first();
  await mistakenCard.getByRole('button', { name: `Delete ${mistaken}` }).click();
  await expect(page.getByRole('heading', { name: mistaken })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: linked })).toBeVisible();

  await page.goto('/goals?view=projects');
  await page.getByText('Add a project').click();
  const addProject = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Create project' }) });
  await addProject.getByLabel('Project name').fill(`Project for ${linked}`);
  await addProject.getByLabel('Related goal').selectOption({ label: linked });
  await addProject.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { name: `Project for ${linked}` })).toBeVisible();

  await page.goto('/goals?view=goals');
  const linkedCard = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: linked }) })
    .first();
  await linkedCard.getByRole('button', { name: `Delete ${linked}` }).click();
  await expect(linkedCard.getByRole('alert')).toContainText('linked work');
  await expect(page.getByRole('heading', { name: linked })).toBeVisible();
});
