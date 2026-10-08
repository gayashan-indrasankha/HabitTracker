import { expect, test } from '@playwright/test';

test('concurrent overlapping schedule submissions commit only one block', async ({ page }) => {
  test.setTimeout(180_000);
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires the isolated scheduling test runner.');
  const tag = Date.now();
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Concurrent Schedule Tester');
  await page.getByLabel('Email address').fill(`schedule-race-${tag}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Schedule-test-password-42');
  await page.getByLabel('Confirm password').fill('Schedule-test-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 90_000 });
  const other = await page.context().newPage();
  async function prepare(target: typeof page, title: string) {
    await target.goto('/week?date=2026-10-12');
    const form = target
      .locator('form')
      .filter({ has: target.getByRole('button', { name: 'Add block' }) });
    await form.locator('[name="title"]').fill(title);
    await form.locator('[name="localStartTime"]').fill('09:00');
    await form.locator('[name="localEndTime"]').fill('10:00');
    await form.locator('[name="startDate"]').fill('2026-10-12');
    for (const day of ['1', '2', '3', '4'])
      await form.locator(`[name="weekday"][value="${day}"]`).uncheck();
    return form;
  }
  try {
    const first = await prepare(page, `Race first ${tag}`);
    const second = await prepare(other, `Race second ${tag}`);
    await Promise.all([
      first.getByRole('button', { name: 'Add block' }).click(),
      second.getByRole('button', { name: 'Add block' }).click(),
    ]);
    await expect
      .poll(
        async () =>
          (await first.getByRole('status').count()) +
          (await first.getByRole('alert').count()) +
          (await second.getByRole('status').count()) +
          (await second.getByRole('alert').count()),
      )
      .toBe(2);
    const successes =
      (await first.getByRole('status').count()) + (await second.getByRole('status').count());
    const conflicts =
      (await first.getByRole('alert').count()) + (await second.getByRole('alert').count());
    expect(successes).toBe(1);
    expect(conflicts).toBe(1);
    await page.reload();
    await expect(
      page
        .locator('article')
        .filter({ hasText: `Race first ${tag}` })
        .or(page.locator('article').filter({ hasText: `Race second ${tag}` })),
    ).toHaveCount(1);
  } finally {
    await other.close();
  }
});

test('recurrence history, premature completion, same-series collision, and restore persist', async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires the isolated scheduling test runner.');
  const name = `Study ${Date.now()}`;
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Schedule Tester');
  await page.getByLabel('Email address').fill(`schedule-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Schedule-test-password-42');
  await page.getByLabel('Confirm password').fill('Schedule-test-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 90_000 });

  await page.goto('/week?date=2026-10-05');
  const add = page.locator('form').filter({ has: page.getByRole('button', { name: 'Add block' }) });
  await add.locator('[name="title"]').fill(name);
  await add.locator('[name="localStartTime"]').fill('09:00');
  await add.locator('[name="localEndTime"]').fill('10:00');
  for (const day of ['1', '3', '4'])
    await add.locator(`[name="weekday"][value="${day}"]`).uncheck();
  await add.locator('[name="startDate"]').fill('2026-10-05');
  await add.getByRole('button', { name: 'Add block' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Time block added' })).toBeVisible();
  const past = page.locator('article').filter({ hasText: name }).first();
  await expect(past).toContainText('09:00–10:00');
  await past.getByRole('button', { name: 'Complete' }).click();
  await expect(past.getByRole('status')).toContainText('Occurrence updated');
  await page.reload();
  await expect(page.locator('article').filter({ hasText: name }).first()).toContainText(
    'completed',
  );

  const series = page
    .locator('li')
    .filter({ hasText: name })
    .filter({ has: page.getByText('Edit series details') })
    .first();
  await series.getByText('Edit series details').click();
  const edit = series
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save block' }) });
  await edit.locator('[name="effectiveDate"]').fill('2026-10-09');
  await edit.locator('[name="localStartTime"]').fill('14:00');
  await edit.locator('[name="localEndTime"]').fill('15:00');
  await edit.getByRole('button', { name: 'Save block' }).click();
  await expect(series.getByRole('status')).toContainText('Time block edited');
  await page.reload();
  await expect(page.locator('article').filter({ hasText: name }).first()).toContainText(
    '09:00–10:00',
  );
  await page.goto('/week?date=2026-10-12');
  const future = page.locator('article').filter({ hasText: name }).first();
  await expect(future).toContainText('14:00–15:00');
  await future.getByRole('button', { name: 'Complete' }).click();
  await expect(future.getByRole('alert')).toContainText('has not finished');

  await future.getByText('Change occurrence').click();
  const move = future.locator('form').filter({ has: page.getByRole('button', { name: 'Move' }) });
  await move.locator('[name="overrideDate"]').fill('2026-10-14');
  await move.locator('[name="overrideStartTime"]').fill('14:30');
  await move.locator('[name="overrideEndTime"]').fill('15:30');
  await move.getByRole('button', { name: 'Move' }).click();
  await expect(move.getByRole('alert')).toContainText('Overlaps');

  const skip = future
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Skip', exact: true }) });
  await skip.locator('[name="reason"]').fill('Recovery day');
  await skip.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(future).toContainText('skipped');
  await page.reload();
  const skipped = page.locator('article').filter({ hasText: name }).first();
  await expect(skipped).toContainText('skipped');
  await expect(skipped).toContainText('Recovery day');
  await page.setViewportSize({ width: 390, height: 844 });
  await skipped.getByRole('button', { name: 'Restore' }).click();
  await expect(skipped).toContainText('planned');
  await page.reload();
  await expect(page.locator('article').filter({ hasText: name }).first()).toContainText('planned');
  await page.goto('/review?week=2026-10-05');
  await expect(page.getByText(/1 of 2 planned sessions completed/)).toBeVisible();

  await page.goto('/week?date=2026-10-12');
  const statusSeries = page
    .locator('li')
    .filter({ hasText: name })
    .filter({ has: page.getByText('Edit series details') })
    .first();
  const pause = statusSeries
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'paused' }) });
  await pause.locator('[name="effectiveDate"]').fill('2026-10-19');
  await pause.getByRole('button', { name: 'paused' }).click();
  await expect(statusSeries.locator('p.text-xs').first()).toContainText('paused');
  await page.goto('/week?date=2026-10-19');
  await expect(page.locator('article').filter({ hasText: name })).toHaveCount(0);
  await page.goto('/week?date=2026-10-05');
  await expect(page.locator('article').filter({ hasText: name }).first()).toContainText(
    '09:00–10:00',
  );
  const archived = page
    .locator('li')
    .filter({ hasText: name })
    .filter({ has: page.getByText('Edit series details') })
    .first();
  const archive = archived
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'archived' }) });
  await archive.locator('[name="effectiveDate"]').fill('2026-10-26');
  await archive.getByRole('button', { name: 'archived' }).click();
  await expect(archived.locator('p.text-xs').first()).toContainText('archived');
  const resume = archived
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'active' }) });
  await resume.locator('[name="effectiveDate"]').fill('2026-11-02');
  await resume.getByRole('button', { name: 'active' }).click();
  await expect(archived.locator('p.text-xs').first()).toContainText('active');
  await page.goto('/week?date=2026-11-02');
  await expect(page.locator('article').filter({ hasText: name })).toHaveCount(2);
  await page.goto('/review?week=2026-10-05');
  await expect(page.getByText(/1 of 2 planned sessions completed/)).toBeVisible();
  const other = await browser.newContext();
  try {
    const otherPage = await other.newPage();
    await otherPage.goto('/register');
    await otherPage.getByLabel('Your name').fill('Other Schedule User');
    await otherPage.getByLabel('Email address').fill(`other-schedule-${Date.now()}@example.test`);
    await otherPage.getByLabel('Password', { exact: true }).fill('Schedule-test-password-42');
    await otherPage.getByLabel('Confirm password').fill('Schedule-test-password-42');
    await otherPage.getByRole('button', { name: 'Create account' }).click();
    await expect(otherPage).toHaveURL(/\/dashboard/, { timeout: 90_000 });
    await otherPage.goto('/week?date=2026-10-05');
    await expect(otherPage.getByText(name)).toHaveCount(0);
  } finally {
    await other.close();
  }
});
