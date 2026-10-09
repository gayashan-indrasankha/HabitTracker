import { expect, test } from '@playwright/test';
import postgres from 'postgres';

test('journal history stays browsable across years and pages', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');

  const email = `journal-history-${Date.now()}@example.test`;
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Journal Tester');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Journal-test-password-42');
  await page.getByLabel('Confirm password').fill('Journal-test-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  try {
    const [{ id: userId }] = await sql<{ id: string }[]>`
      select id from "user" where email = ${email}
    `;
    for (let day = 1; day <= 14; day++) {
      const date = `2024-01-${String(day).padStart(2, '0')}`;
      await sql`insert into daily_notes (user_id, date, content) values (${userId}, ${date}, ${`Entry ${date}\nThe full entry has another line.`})`;
    }
    await sql`insert into daily_notes (user_id, date, content) values (${userId}, '2021-06-10', 'Entry 2021')`;
    await sql`insert into daily_notes (user_id, date, content) values (${userId}, '2019-12-31', 'Entry 2019')`;
  } finally {
    await sql.end();
  }

  await page.goto('/notes');
  await expect(page.getByRole('heading', { name: 'Past entries' })).toBeVisible();
  await expect(page.getByText('16 entries')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Read journal entry for January 14, 2024' }),
  ).toBeVisible();
  await expect(page.getByText('Entry 2024-01-01')).toHaveCount(0);
  await page.getByRole('button', { name: 'Read journal entry for January 14, 2024' }).click();
  const entry = page.getByRole('dialog', { name: 'January 14, 2024' });
  await expect(entry).toContainText('The full entry has another line.');
  await expect(entry.getByRole('textbox')).toHaveCount(0);
  await expect(entry.getByRole('button', { name: /edit|delete/i })).toHaveCount(0);
  await entry.getByRole('button', { name: 'Close journal entry' }).click();
  await expect(entry).not.toBeVisible();

  await page.getByRole('link', { name: 'Next' }).click();
  await expect(
    page.getByRole('button', { name: 'Read journal entry for December 31, 2019' }),
  ).toBeVisible();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Browse journal by year' })
    .getByRole('link', { name: '2021' })
    .click();
  await expect(
    page.getByRole('button', { name: 'Read journal entry for June 10, 2021' }),
  ).toBeVisible();
  await expect(page.getByText('1 entry in 2021')).toBeVisible();
  await expect(page.getByText('Entry 2019')).toHaveCount(0);

  await page.goto('/today');
  await page.getByText('Finish your day').click();
  await page.getByLabel('Daily journal entry').fill('Attempted edit to an old entry');
  const editor = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save entry' }) });
  await editor.locator('[name="date"]').evaluate((input: HTMLInputElement) => {
    input.value = '2024-01-14';
  });
  await editor.getByRole('button', { name: 'Save entry' }).click();
  await expect(editor.getByRole('alert')).toContainText('Past journal entries are read-only.');
  await page.goto('/notes?year=2024');
  await page.getByRole('button', { name: 'Read journal entry for January 14, 2024' }).click();
  await expect(page.getByRole('dialog', { name: 'January 14, 2024' })).toContainText(
    'The full entry has another line.',
  );
});
