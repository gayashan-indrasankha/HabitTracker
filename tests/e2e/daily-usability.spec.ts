import { expect, test } from '@playwright/test';

test('Today focus, linked completion, simple empty state, and short review persist', async ({
  page,
}) => {
  test.setTimeout(180_000);
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const title = `Daily focus ${Date.now()}`;
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Daily Tester');
  await page.getByLabel('Email address').fill(`daily-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Daily-test-password-42');
  await page.getByLabel('Confirm password').fill('Daily-test-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/goals');
  await page.getByText('Add a task').click();
  const addTask = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Add task' }) });
  await addTask.locator('[name="title"]').fill(title);
  await addTask.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await page.goto('/today');
  await expect(page.getByRole('region', { name: 'Next action' })).toContainText('Choose a task');
  await page.getByText('Finish your day').click();
  await page.getByRole('button', { name: 'Plan tomorrow' }).click();
  const tomorrowChoice = page.locator('form').filter({ hasText: title });
  await tomorrowChoice.getByRole('button', { name: 'Add to slot' }).click();
  await expect(
    page.locator('section[aria-labelledby="tomorrow-priorities-heading"]'),
  ).toContainText(title);
  await page.reload();
  await page.getByText('Finish your day').click();
  await expect(
    page.locator('section[aria-labelledby="tomorrow-priorities-heading"]'),
  ).toContainText(title);
  await page.getByRole('button', { name: 'What went well today?' }).click();
  await expect(page.getByLabel('Daily journal entry')).toHaveValue('What went well today?\n');
  await page.getByLabel('Daily journal entry').fill('Worked on the first project task.');
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
  await page.getByLabel('Daily journal entry').fill('A new thought.');
  await expect(page.getByRole('button', { name: 'Save entry' })).toBeEnabled();
  await page.getByLabel('Daily journal entry').fill('Worked on the first project task.');
  await page.getByRole('button', { name: 'Save entry' }).click();
  await page.reload();
  await page.getByText('Finish your day').click();
  await expect(page.getByLabel('Daily journal entry')).toHaveValue(
    'Worked on the first project task.',
  );
  await page.goto('/notes');
  await expect(page.getByRole('heading', { name: 'Journal', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save entry' })).toHaveCount(0);
  await expect(page.getByText('Worked on the first project task.')).toBeVisible();
  await page.getByRole('link', { name: 'Edit today’s entry' }).click();
  await expect(page.getByLabel('Daily journal entry')).toHaveValue(
    'Worked on the first project task.',
  );
  await page.getByRole('button', { name: 'Add to Today' }).click();
  const choice = page.locator('form').filter({ hasText: title });
  await choice.getByRole('button', { name: 'Add to slot' }).click();
  await expect(page.getByRole('region', { name: 'Next action' })).toContainText(title);
  await expect(page.getByRole('region', { name: 'Next action' }).getByRole('button')).toHaveCount(
    0,
  );
  await expect(
    page.locator('#today-priorities').getByRole('button', { name: 'Mark done' }),
  ).toBeVisible();

  await page.goto('/week?date=2026-10-05');
  await page.getByText('Time blocks and detailed planning (optional)').click();
  const addBlock = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Add block' }) });
  await addBlock.locator('[name="title"]').fill(`${title} session`);
  await addBlock.locator('[name="localStartTime"]').fill('09:00');
  await addBlock.locator('[name="localEndTime"]').fill('10:00');
  await addBlock.locator('[name="startDate"]').fill('2026-10-09');
  await addBlock.locator('[name="oneOff"]').check();
  await addBlock.locator('[name="taskId"]').selectOption({ label: title });
  await addBlock.getByRole('button', { name: 'Add block' }).click();
  await page.goto('/today');
  await expect(page.locator('#today-schedule')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Next action' })).toContainText(title);
  await page.goto('/week?date=2026-10-09');
  await page.getByText('Time blocks and detailed planning (optional)').click();
  const session = page
    .locator('#day-2026-10-09 article')
    .filter({ has: page.getByRole('heading', { name: `${title} session` }) });
  await expect(session).toBeVisible();
  const complete = session
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Complete' }) });
  await complete.locator('[name="completeLinkedTask"]').check();
  await complete.getByRole('button', { name: 'Complete' }).click();
  await expect(session).toContainText('completed');
  await page.reload();
  await page.getByText('Time blocks and detailed planning (optional)').click();
  await expect(session).toContainText('completed');
  await page.goto('/goals?show=finished');
  const task = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
    .first();
  await expect(task).toContainText('Done');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/today');
  await expect(page.getByRole('button', { name: 'Show less today' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Show less today' })).toHaveCount(0);

  await page.goto('/review?week=2026-10-05');
  await expect(page.getByRole('button', { name: 'Save weight' })).toBeVisible();
  const weight = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save weight' }) });
  await weight.locator('[name="value"]').fill('73.2');
  await weight.getByRole('button', { name: 'Save weight' }).click();
  await expect(weight.getByRole('status')).toContainText('Measurement recorded');
  await expect(page.getByText('Add detail by life area (optional)')).toBeVisible();
  const review = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save review' }) });
  await review.locator('[name="obstacles"]').fill('Unexpected interruption');
  await review.locator('[name="nextWins"]').fill('Finish the project milestone');
  await review.getByRole('button', { name: 'Save review' }).click();
  await expect(review.getByRole('status')).toContainText('Review draft saved');
  await page.reload();
  await expect(page.locator('[name="nextWins"]')).toHaveValue('Finish the project milestone');
});
