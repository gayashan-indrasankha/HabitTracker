import { expect, test, type Page } from '@playwright/test';

async function register(page: Page, prefix: string) {
  const tag = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await page.goto('/register');
  await page.getByLabel('Your name').fill('P3 Tester');
  await page.getByLabel('Email address').fill(`${tag}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Evidence-test-password-42');
  await page.getByLabel('Confirm password').fill('Evidence-test-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 90_000 });
  return tag;
}

test('academic practice and milestone acceptance persist separately from grades and task completion', async ({
  page,
}) => {
  test.setTimeout(240_000);
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const tag = await register(page, 'p3-academic');
  await page.goto('/goals?view=study');
  await page.getByText('Add your subjects').click();
  const subject = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save subject' }) })
    .first();
  await subject.locator('[name="name"]').fill(`Algorithms ${tag}`);
  await subject.getByRole('button', { name: 'Save subject' }).click();
  await expect(subject.getByRole('status')).toContainText('Subject saved');
  await page.goto('/goals/evidence');
  await page.locator('#university').getByText('Add topic', { exact: true }).click();
  const addTopic = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save topic' }) });
  await addTopic.locator('[name="title"]').fill(`Graphs ${tag}`);
  await addTopic.getByRole('button', { name: 'Save topic' }).click();
  const topic = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: `Graphs ${tag}` }) })
    .first();
  await expect(topic).toContainText('Not assessed');
  await topic.locator('summary').filter({ hasText: 'Record practice' }).click();
  const practice = topic
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Record practice' }) });
  await practice.locator('[name="type"]').selectOption('quiz');
  await practice.locator('[name="correct"]').fill('8');
  await practice.locator('[name="total"]').fill('10');
  await practice.getByRole('button', { name: 'Record practice' }).click();
  await expect(practice.getByRole('status')).toContainText('Practice evidence recorded');
  await page.reload();
  await expect(topic).toContainText('Practising');
  await expect(topic).toContainText('Latest score 8/10');
  await topic.locator('summary').filter({ hasText: 'Record practice' }).click();
  await practice.locator('[name="correct"]').fill('11');
  await practice.locator('[name="total"]').fill('10');
  await practice.getByRole('button', { name: 'Record practice' }).click();
  await expect(practice.getByRole('alert')).toContainText('correct');
  await practice.locator('[name="correct"]').fill('3');
  await practice.locator('[name="total"]').fill('10');
  await practice.getByRole('button', { name: 'Record practice' }).click();
  await expect(practice.getByRole('status')).toContainText('Practice evidence recorded');
  await page.reload();
  await expect(topic).toContainText('Needs review');
  await expect(topic).toContainText('Actual grade: Not recorded');

  await page.goto('/goals?view=projects');
  await page.getByText('Add a project').click();
  const project = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Create project' }) });
  await project.locator('[name="name"]').fill(`Portfolio ${tag}`);
  await project.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { name: `Portfolio ${tag}` })).toBeVisible();
  await page.goto('/goals');
  await page.getByText('Add a task').click();
  const task = page.locator('form').filter({ has: page.getByRole('button', { name: 'Add task' }) });
  await task.locator('[name="title"]').fill(`Auth milestone ${tag}`);
  await task.getByText('More task details').click();
  await task.locator('[name="projectId"]').selectOption({ label: `Portfolio ${tag}` });
  await task.locator('[name="isMilestone"]').check();
  await task.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByRole('heading', { name: `Auth milestone ${tag}` })).toBeVisible();
  await page.goto('/goals/evidence');
  const milestone = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: `Auth milestone ${tag}` }) })
    .first();
  await expect(milestone).toContainText('Task todo');
  await milestone.getByText('Criteria and review').click();
  const addCriterion = milestone
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Add criterion' }) });
  await addCriterion.locator('[name="title"]').fill('Authorization tests pass');
  await addCriterion.getByRole('button', { name: 'Add criterion' }).click();
  await expect(addCriterion.getByRole('status')).toContainText('Quality criterion saved');
  await page.reload();
  await milestone.getByText('Criteria and review').click();
  const criterion = milestone
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Update criterion' }) });
  await criterion.locator('[name="met"]').check();
  await criterion.getByRole('button', { name: 'Update criterion' }).click();
  await expect(criterion.getByRole('status')).toContainText('Quality criterion saved');
  await page.reload();
  await milestone.getByText('Criteria and review').click();
  const review = milestone
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save quality review' }) });
  await review.locator('[name="state"]').selectOption('meets_criteria');
  await review.getByRole('button', { name: 'Save quality review' }).click();
  await expect(review.getByRole('status')).toContainText('Milestone review saved');
  await page.reload();
  await expect(milestone).toContainText('Quality meets criteria');
  await expect(milestone).toContainText('Task todo');
  await page.goto('/review?week=2026-10-05');
  await page.getByText('Explore goal evidence').click();
  await expect(page.getByRole('heading', { name: 'Evidence across goals' })).toBeVisible();
  await expect(page.getByText(/1 topics practised/)).toBeVisible();
});

test('interview, English, and weight evidence can be logged and corrected on mobile', async ({
  page,
}) => {
  test.setTimeout(240_000);
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  await register(page, 'p3-skills');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/goals/evidence');
  await page.getByText('Add interview topic').click();
  const topic = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Add topic' }) });
  await topic.locator('[name="category"]').fill('SQL');
  await topic.locator('[name="title"]').fill('JOINs');
  await topic.getByRole('button', { name: 'Add topic' }).click();
  await page.reload();
  await page.getByText('Record interview practice').first().click();
  const interview = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Record interview practice' }) });
  await interview.locator('[name="technical"]').fill('2');
  await interview.locator('[name="correct"]').fill('2');
  await interview.locator('[name="total"]').fill('5');
  await interview.locator('[name="weaknesses"]').fill('JOIN order');
  await interview.locator('[name="nextAction"]').fill('Review SQL JOINs');
  await interview.getByRole('button', { name: 'Record interview practice' }).click();
  await page.reload();
  await expect(page.getByText(/Suggested next practice: JOINs/)).toBeVisible();
  await expect(page.getByText('Recorded result: 2/5 correct')).toBeVisible();
  await page.getByRole('button', { name: 'Create follow-up task' }).click();
  await expect(page.getByText('Linked follow-up task created.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Linked follow-up task created.')).toBeVisible();
  await page.getByText('Record English practice').first().click();
  const english = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Record English practice' }) });
  await english.locator('[name="topic"]').fill('Explain API design');
  await english.locator('[name="durationMinutes"]').fill('12');
  await english.locator('[name="fluency"]').fill('3');
  await english.locator('[name="grammar"]').fill('2');
  await english.getByRole('button', { name: 'Record English practice' }).click();
  await page.reload();
  await expect(page.getByText(/12 recorded minutes/)).toBeVisible();
  await expect(page.getByText(/SELF-ASSESSED/)).toBeVisible();
  await page.getByText('Record grammar correction').click();
  const correction = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Add correction' }) });
  await correction.locator('[name="original"]').fill('I goes');
  await correction.locator('[name="corrected"]').fill('I go');
  await correction.locator('[name="category"]').fill('Agreement');
  await correction.getByRole('button', { name: 'Add correction' }).click();
  await page.reload();
  await expect(page.getByText(/I goes → I go/)).toBeVisible();
  await page.getByRole('button', { name: 'Mark correction reviewed' }).click();
  await page.reload();
  await expect(page.getByText('Reviewed', { exact: true })).toBeVisible();
  await page.getByText('Record actual weight').click();
  const weight = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Record weight' }) });
  for (const [date, value] of [
    ['2026-10-01', '70'],
    ['2026-10-02', '71'],
    ['2026-10-08', '72'],
  ]) {
    await weight.locator('[name="date"]').fill(date);
    await weight.locator('[name="value"]').fill(value);
    await weight.getByRole('button', { name: 'Record weight' }).click();
    await expect(weight.getByRole('status')).toContainText('recorded');
  }
  await page.reload();
  await expect(page.getByText(/Latest measured week: 72.0 kg/)).toBeVisible();
  await page.getByText('Correct measurements').click();
  const correctionWeight = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save correction' }) })
    .first();
  await correctionWeight.locator('[name="value"]').fill('73');
  await correctionWeight.getByRole('button', { name: 'Save correction' }).click();
  await page.reload();
  await expect(page.getByText(/Latest measured week: 73.0 kg/)).toBeVisible();
});

test('application stages, follow-up task, and ownership remain private', async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  await register(page, 'p3-app-owner');
  await page.goto('/goals/evidence');
  await page.getByText('Save opportunity').first().click();
  const create = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save opportunity' }) });
  await create.locator('[name="company"]').fill('Example Labs');
  await create.locator('[name="roleTitle"]').fill('SE Intern');
  await create.getByRole('button', { name: 'Save opportunity' }).click();
  await expect(create.getByRole('status')).toContainText('Opportunity saved');
  await page.reload();
  const application = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Example Labs · SE Intern' }) })
    .first();
  await expect(application).toContainText('Not submitted');
  await expect(page.getByText(/0 submitted/)).toBeVisible();
  const stage = application
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Record stage' }) });
  await stage.locator('[name="stage"]').selectOption('applied');
  await stage.locator('[name="appliedOn"]').fill('2026-10-08');
  await stage.getByRole('button', { name: 'Record stage' }).click();
  await expect(stage.getByRole('status')).toContainText('stage recorded');
  await page.reload();
  await expect(page.getByText(/1 submitted/)).toBeVisible();
  await stage.locator('[name="stage"]').selectOption('online_assessment');
  await stage.getByRole('button', { name: 'Record stage' }).click();
  await expect(stage.getByRole('status')).toContainText('stage recorded');
  await page.reload();
  await application.getByText('Stage history').click();
  await expect(application).toContainText('saved → applied');
  await expect(application).toContainText('applied → online_assessment');
  await application.getByText('Edit details').click();
  const edit = application
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save application' }) });
  await edit.locator('[name="followUpDate"]').fill('2026-10-09');
  await edit.getByRole('button', { name: 'Save application' }).click();
  await expect(edit.getByRole('status')).toContainText('Application updated');
  await page.reload();
  await application.getByRole('button', { name: 'Create follow-up task' }).click();
  await page.reload();
  await expect(application).toContainText('Linked ordinary task created.');
  const ownerId = await application
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Record stage' }) })
    .locator('[name="id"]')
    .inputValue();
  const otherContext = await browser.newContext({ baseURL: 'http://localhost:3100' });
  try {
    const other = await otherContext.newPage();
    await register(other, 'p3-app-other');
    await other.goto('/goals/evidence');
    await expect(other.getByRole('heading', { name: 'Example Labs · SE Intern' })).toHaveCount(0);
    await other.getByText('Save opportunity').first().click();
    const ownCreate = other
      .locator('form')
      .filter({ has: other.getByRole('button', { name: 'Save opportunity' }) });
    await ownCreate.locator('[name="company"]').fill('Other Labs');
    await ownCreate.locator('[name="roleTitle"]').fill('DevOps Intern');
    await ownCreate.getByRole('button', { name: 'Save opportunity' }).click();
    await expect(ownCreate.getByRole('status')).toContainText('Opportunity saved');
    await other.reload();
    const ownStage = other
      .locator('article')
      .filter({ has: other.getByRole('heading', { name: 'Other Labs · DevOps Intern' }) })
      .locator('form')
      .filter({ has: other.getByRole('button', { name: 'Record stage' }) });
    await ownStage.locator('[name="stage"]').selectOption('applied');
    await ownStage.locator('[name="appliedOn"]').fill('2026-10-08');
    await ownStage.locator('[name="id"]').evaluate((input: HTMLInputElement, id) => {
      input.value = id;
    }, ownerId);
    await expect(ownStage.locator('[name="id"]')).toHaveValue(ownerId);
    await ownStage.getByRole('button', { name: 'Record stage' }).click();
    await expect(ownStage.getByRole('alert')).toContainText('not found');
  } finally {
    await otherContext.close();
  }
});
