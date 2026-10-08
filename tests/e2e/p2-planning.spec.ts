import { expect, test } from '@playwright/test';

test('weekly adjustment, time off, optional gym, and minimum day persist', async ({ page }) => {
  test.setTimeout(240_000);
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const tag = Date.now();
  await page.goto('/register');
  await page.getByLabel('Your name').fill('P2 Planner');
  await page.getByLabel('Email address').fill(`p2-${tag}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Planning-test-password-42');
  await page.getByLabel('Confirm password').fill('Planning-test-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/today/, { timeout: 90_000 });
  await page.goto('/week?date=2026-10-05');
  await expect(page.getByRole('heading', { name: 'Weekly workload' })).toBeVisible();
  await expect(page.getByText('Not recorded')).toBeVisible();
  const capacity = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save capacity' }) });
  await capacity.locator('[name="capacity"]').fill('45');
  await capacity.getByRole('button', { name: 'Save capacity' }).click();
  await expect(capacity.getByRole('status')).toContainText('saved');
  const add = page.locator('form').filter({ has: page.getByRole('button', { name: 'Add block' }) });
  await add.locator('[name="title"]').fill(`P2 focus ${tag}`);
  await add.locator('[name="localStartTime"]').fill('11:00');
  await add.locator('[name="localEndTime"]').fill('12:00');
  await add.locator('[name="startDate"]').fill('2026-10-09');
  await add.locator('[name="oneOff"]').check();
  await add.getByRole('button', { name: 'Add block' }).click();
  const focus = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: `P2 focus ${tag}` }) })
    .first();
  await expect(focus).toBeVisible();
  await expect(page.getByText('Over capacity · adjust')).toBeVisible();
  await focus.getByText('Adjust', { exact: true }).click();
  const adjust = focus
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save adjustment' }) });
  await adjust.locator('[name="overrideDate"]').fill('2026-10-10');
  await adjust.locator('[name="overrideEndTime"]').fill('11:30');
  await adjust.getByRole('button', { name: 'Save adjustment' }).click();
  await expect(
    page.locator('#day-2026-10-10 article').filter({ hasText: `P2 focus ${tag}` }),
  ).toContainText('11:00–11:30');
  await page.reload();
  await expect(
    page.locator('#day-2026-10-10 article').filter({ hasText: `P2 focus ${tag}` }),
  ).toBeVisible();
  await add.locator('[name="title"]').fill(`P2 lecture ${tag}`);
  await add.locator('[name="localStartTime"]').fill('09:00');
  await add.locator('[name="localEndTime"]').fill('10:00');
  await add.locator('[name="startDate"]').fill('2026-10-10');
  await add.locator('[name="oneOff"]').check();
  await add.locator('[name="isFixed"]').check();
  await add.getByRole('button', { name: 'Add block' }).click();
  const timeOff = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Plan time off' }) })
    .first();
  const newPlan = timeOff
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Plan time off' }) });
  await newPlan.locator('[name="date"]').fill('2026-10-10');
  await newPlan.locator('[name="type"]').selectOption('Travel');
  await newPlan.getByRole('button', { name: 'Preview affected schedule' }).click();
  await expect(newPlan.getByRole('status')).toContainText(`P2 lecture ${tag}`);
  await expect(newPlan.getByRole('status')).toContainText(`P2 focus ${tag}`);
  await newPlan.locator('[name="selected"]').check();
  await newPlan.locator('[name="confirm"]').check();
  await newPlan.getByRole('button', { name: 'Plan time off' }).click();
  await expect(newPlan.getByRole('status')).toContainText('1 flexible sessions excused');
  await page.reload();
  await expect(
    page.locator('#day-2026-10-10 article').filter({ hasText: `P2 focus ${tag}` }),
  ).toContainText('excused');
  await expect(
    page.locator('#day-2026-10-10 article').filter({ hasText: `P2 lecture ${tag}` }),
  ).toContainText('planned');
  const gym = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Optional fifth gym visit' }) });
  await gym.locator('[name="enabled"]').selectOption('yes');
  await gym.locator('[name="day"]').selectOption('6');
  await gym.locator('[name="effectiveDate"]').fill('2026-10-09');
  await gym.getByRole('button', { name: 'Save optional workout' }).click();
  await expect(gym.getByRole('status')).toContainText('enabled');
  await page.reload();
  await expect(
    page.locator('#day-2026-10-11 article').filter({ hasText: 'Optional light workout' }),
  ).toHaveCount(1);
  await gym.locator('[name="enabled"]').selectOption('no');
  await gym.locator('[name="effectiveDate"]').fill('2026-10-12');
  await gym.getByRole('button', { name: 'Save optional workout' }).click();
  await expect(gym.getByRole('status')).toContainText('disabled');
  await page.goto('/week?date=2026-10-12');
  await expect(page.locator('article').filter({ hasText: 'Optional light workout' })).toHaveCount(
    0,
  );
  await page.goto('/week?date=2026-10-05');
  const planned = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Plan time off' }) });
  await planned.getByText('Past and planned time off').click();
  await planned.getByText('Edit or cancel').click();
  await planned.getByRole('button', { name: 'Cancel time off' }).click();
  await expect(planned.getByText(/Travel · cancelled/)).toBeVisible();
  await page.reload();
  await expect(
    page.locator('#day-2026-10-10 article').filter({ hasText: `P2 focus ${tag}` }),
  ).toContainText('planned');
  const again = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Plan time off' }) })
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Plan time off' }) });
  await again.locator('[name="date"]').fill('2026-10-10');
  await again.locator('[name="confirm"]').check();
  await again.getByRole('button', { name: 'Plan time off' }).click();
  await expect(again.getByRole('status')).toContainText('Time off saved');
  await page.reload();
  await page.getByText('Past and planned time off').click();
  await expect(page.getByText(/2026-10-10.*Recovery.*active/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/today');
  await page.getByLabel('Day mode').selectOption('minimum');
  await page.getByRole('button', { name: 'Update mode' }).click();
  await expect(page.getByRole('heading', { name: 'Small next action' })).toBeVisible();
  const small = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save small action' }) });
  await small.locator('[name="action"]').fill('Read two pages');
  await small.locator('[name="done"]').check();
  await small.getByRole('button', { name: 'Save small action' }).click();
  await page.reload();
  await expect(page.getByText('Smaller action recorded.')).toBeVisible();
  await page.getByRole('button', { name: 'Resume normal plan' }).click();
  await expect(page.getByRole('heading', { name: 'Small next action' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Day mode')).toHaveValue('normal');
});

test('planning settings and time-off edits stay within the signed-in account', async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const tag = Date.now();
  async function register(target: typeof page, name: string) {
    await target.goto('/register');
    await target.getByLabel('Your name').fill(name);
    await target
      .getByLabel('Email address')
      .fill(`${name.toLowerCase().replaceAll(' ', '-')}-${tag}@example.test`);
    await target.getByLabel('Password', { exact: true }).fill('Planning-test-password-42');
    await target.getByLabel('Confirm password').fill('Planning-test-password-42');
    await target.getByRole('button', { name: 'Create account' }).click();
    await expect(target).toHaveURL(/\/today/, { timeout: 90_000 });
  }
  await register(page, 'P2 owner');
  await page.goto('/week?date=2026-10-05');
  const ownerPlanner = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Plan time off' }) });
  const ownerCreate = ownerPlanner
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Plan time off' }) });
  await ownerCreate.locator('[name="date"]').fill('2026-10-10');
  await ownerCreate.locator('[name="confirm"]').check();
  await ownerCreate.getByRole('button', { name: 'Plan time off' }).click();
  await expect(ownerCreate.getByRole('status')).toContainText('Time off saved');
  await page.reload();
  await ownerPlanner.getByText('Past and planned time off').click();
  await ownerPlanner.getByText('Edit or cancel').click();
  const ownerId = await ownerPlanner
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Cancel time off' }) })
    .locator('[name="id"]')
    .inputValue();
  const otherContext = await browser.newContext({ baseURL: 'http://localhost:3100' });
  try {
    const other = await otherContext.newPage();
    await register(other, 'P2 other');
    await other.goto('/week?date=2026-10-05');
    const planner = other
      .locator('section')
      .filter({ has: other.getByRole('heading', { name: 'Plan time off' }) });
    const create = planner
      .locator('form')
      .filter({ has: other.getByRole('button', { name: 'Plan time off' }) });
    await create.locator('[name="date"]').fill('2026-10-11');
    await create.locator('[name="confirm"]').check();
    await create.getByRole('button', { name: 'Plan time off' }).click();
    await expect(create.getByRole('status')).toContainText('Time off saved');
    await other.reload();
    await planner.getByText('Past and planned time off').click();
    await planner.getByText('Edit or cancel').click();
    const edit = planner
      .locator('form')
      .filter({ has: other.getByRole('button', { name: 'Save time off' }) });
    await edit.locator('[name="id"]').evaluate((input: HTMLInputElement, id) => {
      input.value = id;
    }, ownerId);
    await edit.locator('[name="confirm"]').check();
    await edit.getByRole('button', { name: 'Save time off' }).click();
    await expect(edit.getByRole('alert')).toContainText('not found');
    const cancel = planner
      .locator('form')
      .filter({ has: other.getByRole('button', { name: 'Cancel time off' }) });
    await cancel.locator('[name="id"]').evaluate((input: HTMLInputElement, id) => {
      input.value = id;
    }, ownerId);
    await cancel.getByRole('button', { name: 'Cancel time off' }).click();
    await expect(cancel.getByRole('alert')).toContainText('not found');
    const capacity = other
      .locator('form')
      .filter({ has: other.getByRole('button', { name: 'Save capacity' }) });
    await capacity.locator('[name="capacity"]').fill('45');
    await capacity.getByRole('button', { name: 'Save capacity' }).click();
    await page.reload();
    await expect(
      page
        .locator('form')
        .filter({ has: page.getByRole('button', { name: 'Save capacity' }) })
        .locator('[name="capacity"]'),
    ).toHaveValue('');
    await other.goto('/today');
    await other.getByLabel('Day mode').selectOption('minimum');
    await other.getByRole('button', { name: 'Update mode' }).click();
    await page.goto('/today');
    await expect(page.getByLabel('Day mode')).toHaveValue('normal');
  } finally {
    await otherContext.close();
  }
});
