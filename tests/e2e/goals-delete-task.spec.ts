import { expect, test } from '@playwright/test';

test('a mistaken task can be deleted without leaving a gap in Today', async ({ page }) => {
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const tag = Date.now();
  const mistaken = `Mistaken task ${tag}`;
  const keep = `Keep task ${tag}`;

  await page.goto('/register');
  await page.getByLabel('Your name').fill('Task deletion tester');
  await page.getByLabel('Email address').fill(`delete-task-${tag}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Delete-task-password-42');
  await page.getByLabel('Confirm password').fill('Delete-task-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/goals');
  await page.getByText('Add a task').click();
  const addTask = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Add task' }) });
  for (const title of [mistaken, keep]) {
    await addTask.getByLabel('Task title').fill(title);
    await addTask.getByRole('button', { name: 'Add task' }).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  }

  await page.goto('/today');
  for (const title of [mistaken, keep]) {
    await page.getByRole('button', { name: 'Add to Today' }).click();
    await page.getByLabel('Search tasks').fill(title);
    await page.getByRole('button', { name: 'Add to slot' }).click();
  }

  await page.goto('/goals');
  const mistakenCard = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: mistaken }) })
    .first();
  await mistakenCard.locator('summary[title="Delete task"]').click();
  await expect(mistakenCard).toContainText(`Delete “${mistaken}”?`);
  await mistakenCard.getByRole('button', { name: 'Delete task' }).click();
  await expect(page.getByRole('heading', { name: mistaken })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: keep })).toBeVisible();

  await page.goto('/today');
  const slots = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Focus tasks' }) })
    .locator('ol > li');
  await expect(slots.first()).toContainText(keep);
});

test('one account cannot delete another account’s task', async ({ page, browser }) => {
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const tag = Date.now();

  async function register(target: typeof page, label: string) {
    await target.goto('/register');
    await target.getByLabel('Your name').fill(label);
    await target.getByLabel('Email address').fill(`${label}-${tag}@example.test`);
    await target.getByLabel('Password', { exact: true }).fill('Delete-task-password-42');
    await target.getByLabel('Confirm password').fill('Delete-task-password-42');
    await target.getByRole('button', { name: 'Create account' }).click();
    await expect(target).toHaveURL(/\/dashboard/);
  }

  async function addTask(target: typeof page, title: string) {
    await target.goto('/goals');
    await target.getByText('Add a task').click();
    const form = target
      .locator('form')
      .filter({ has: target.getByRole('button', { name: 'Add task' }) });
    await form.getByLabel('Task title').fill(title);
    await form.getByRole('button', { name: 'Add task' }).click();
    return target
      .locator('li')
      .filter({ has: target.getByRole('heading', { name: title }) })
      .first();
  }

  await register(page, 'Owner');
  const ownerCard = await addTask(page, `Owner task ${tag}`);
  await ownerCard.locator('summary[title="Delete task"]').click();
  const ownerId = await ownerCard
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Delete task' }) })
    .locator('[name="id"]')
    .inputValue();

  const otherContext = await browser.newContext({ baseURL: 'http://localhost:3100' });
  try {
    const other = await otherContext.newPage();
    await register(other, 'Other');
    const otherCard = await addTask(other, `Other task ${tag}`);
    await otherCard.locator('summary[title="Delete task"]').click();
    const deleteForm = otherCard
      .locator('form')
      .filter({ has: other.getByRole('button', { name: 'Delete task' }) });
    await deleteForm.locator('[name="id"]').evaluate((input: HTMLInputElement, id) => {
      input.value = id;
    }, ownerId);
    await deleteForm.getByRole('button', { name: 'Delete task' }).click();
    await expect(deleteForm.getByRole('alert')).toContainText('Task not found');
    await page.reload();
    await expect(page.getByRole('heading', { name: `Owner task ${tag}` })).toBeVisible();
  } finally {
    await otherContext.close();
  }
});
