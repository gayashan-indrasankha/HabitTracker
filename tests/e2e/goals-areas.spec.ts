import { expect, test } from '@playwright/test';

test('a new area can be added and reused for tasks and goals', async ({ page }) => {
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const tag = Date.now();
  const area = `Creative work ${tag}`;

  await page.goto('/register');
  await page.getByLabel('Your name').fill('Area Tester');
  await page.getByLabel('Email address').fill(`area-${tag}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Area-test-password-42');
  await page.getByLabel('Confirm password').fill('Area-test-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/goals');
  await page.getByText('Add a task').click();
  const taskForm = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Add task' }) });
  await taskForm.getByLabel('Area', { exact: true }).selectOption('');
  await taskForm.getByLabel('New area name').fill(area);
  await taskForm.getByLabel('Task title').fill(`First area task ${tag}`);
  await taskForm.getByRole('button', { name: 'Add task' }).click();
  await expect(taskForm.getByText('Task added', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: `First area task ${tag}` })).toBeVisible();

  await page.reload();
  await page.getByText('Add a task').click();
  await taskForm.getByLabel('Area', { exact: true }).selectOption({ label: area });
  await taskForm.getByLabel('Task title').fill(`Second area task ${tag}`);
  await taskForm.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByRole('heading', { name: `Second area task ${tag}` })).toBeVisible();

  await page.goto('/goals?view=goals');
  await page.getByText('Add a goal').click();
  const goalForm = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Create goal' }) });
  await goalForm.getByLabel('Life area').selectOption({ label: area });
  await goalForm.getByLabel('Title').fill(`Area goal ${tag}`);
  await goalForm.getByRole('button', { name: 'Create goal' }).click();
  await expect(page.getByRole('heading', { name: `Area goal ${tag}` })).toBeVisible();
});
