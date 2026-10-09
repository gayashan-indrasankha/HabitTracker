import { test, expect } from '@playwright/test';

test('two browser sessions keep separate user identities', async ({ browser }) => {
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const first = await browser.newContext();
  const second = await browser.newContext();
  try {
    const firstPage = await first.newPage();
    const secondPage = await second.newPage();
    const password = 'Separate-session-password-42';
    const suffix = Date.now();

    for (const [page, name, email] of [
      [firstPage, 'First Account', `first-${suffix}@example.test`],
      [secondPage, 'Second Account', `second-${suffix}@example.test`],
    ] as const) {
      await page.goto('/register');
      await page.getByLabel('Your name').fill(name);
      await page.getByLabel('Email address').fill(email);
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByLabel('Confirm password').fill(password);
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page).toHaveURL(/\/dashboard/);
    }

    await firstPage.reload();
    await secondPage.reload();
    await expect(firstPage.getByRole('button', { name: /First Account/ })).toBeVisible();
    await expect(secondPage.getByRole('button', { name: /Second Account/ })).toBeVisible();
    await expect(firstPage.getByRole('button', { name: /Second Account/ })).toHaveCount(0);
  } finally {
    await first.close();
    await second.close();
  }
});

test('registration, persistent session, logout, login, and protected routes', async ({ page }) => {
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const email = `phase2-${Date.now()}@example.test`;
  const password = 'Phase2-test-password-42';

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);

  await page.goto('/register');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Name must be at least 2 characters')).toBeVisible();

  await page.getByLabel('Your name').fill('Phase Two Tester');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'LifeOS' }).first()).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(navigation.getByRole('link').first()).toHaveText('Home');
  await expect(navigation.getByRole('link', { name: 'Home' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard/);
  await navigation.getByRole('link', { name: 'Today' }).click();
  await expect(page).toHaveURL(/\/today/);
  await page.goto('/login');
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole('button', { name: /Phase Two Tester/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings/);

  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/settings/);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});
