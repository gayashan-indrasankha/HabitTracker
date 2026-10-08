import { expect, test } from '@playwright/test';

test('goal and project edits, priority management, day modes, and mobile controls persist', async ({
  page,
}) => {
  test.setTimeout(240_000);
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const tag = Date.now();
  const goalName = `P1 goal ${tag}`;
  const projectName = `P1 project ${tag}`;
  const names = ['Alpha', 'Beta', 'Gamma', 'Delta'].map((item) => `${item} ${tag}`);
  await page.goto('/register');
  await page.getByLabel('Your name').fill('P1 Tester');
  await page.getByLabel('Email address').fill(`p1-${tag}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Editing-test-password-42');
  await page.getByLabel('Confirm password').fill('Editing-test-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 90_000 });
  await page.goto('/goals');

  await page.getByText('Add a goal').click();
  const addGoal = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Create goal' }) });
  await addGoal.locator('[name="title"]').fill(goalName);
  await addGoal.locator('[name="description"]').fill('First description');
  await addGoal.getByRole('button', { name: 'Create goal' }).click();
  await expect(page.getByRole('heading', { name: goalName })).toBeVisible();
  const goalRow = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: goalName }) })
    .first();
  await goalRow.getByText('Edit goal').click();
  const editGoal = goalRow
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save goal' }) });
  await expect(editGoal.locator('[name="description"]')).toHaveValue('First description');
  await editGoal.locator('[name="title"]').fill(`${goalName} edited`);
  await editGoal.locator('[name="description"]').fill('');
  await editGoal.locator('[name="targetDate"]').fill('2026-12-01');
  await editGoal.getByRole('button', { name: 'Save goal' }).click();
  await expect(page.getByRole('heading', { name: `${goalName} edited` })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: `${goalName} edited` })).toBeVisible();

  await page.getByText('Add a goal').click();
  await addGoal.locator('[name="title"]').fill(`${goalName} second`);
  await addGoal.getByRole('button', { name: 'Create goal' }).click();
  await expect(page.getByRole('heading', { name: `${goalName} second` })).toBeVisible();

  await page.getByText('Add a project').click();
  const addProject = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Create project' }) });
  await addProject.locator('[name="name"]').fill(projectName);
  await addProject.locator('[name="goalId"]').selectOption({ label: `${goalName} edited` });
  await addProject.getByRole('button', { name: 'Create project' }).click();
  const projectRow = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: projectName }) })
    .first();
  await projectRow.getByText('Edit project').click();
  const editProject = projectRow
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save project' }) });
  await editProject.locator('[name="name"]').fill(`${projectName} edited`);
  await editProject.locator('[name="deadline"]').fill('2027-01-15');
  await editProject.locator('[name="repositoryUrl"]').fill('https://example.com/portfolio');
  await editProject.getByRole('button', { name: 'Save project' }).click();
  await expect(page.getByRole('heading', { name: `${projectName} edited` })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Repository' })).toHaveAttribute(
    'href',
    'https://example.com/portfolio',
  );

  for (const name of names) {
    const addTask = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: 'Add task' }) });
    if (!(await addTask.isVisible())) await page.getByText('Add a task').click();
    await addTask.locator('[name="title"]').fill(name);
    await addTask.locator('[name="projectId"]').selectOption({ label: `${projectName} edited` });
    await addTask.getByRole('button', { name: 'Add task' }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }
  const linkedProject = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: `${projectName} edited` }) })
    .first();
  await linkedProject.getByText('Edit project').click();
  const linkedEdit = linkedProject
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save project' }) });
  await linkedEdit.locator('[name="goalId"]').selectOption({ label: `${goalName} second` });
  await linkedEdit.getByRole('button', { name: 'Save project' }).click();
  await expect(linkedEdit.getByRole('status')).toContainText('Project saved');
  await page.reload();
  for (const name of names) await expect(page.getByRole('heading', { name })).toBeVisible();
  const persistedProject = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: `${projectName} edited` }) })
    .first();
  await persistedProject.getByText('Edit project').click();
  await expect(persistedProject.locator('[name="goalId"]')).toHaveValue(
    await page
      .locator('li')
      .filter({ has: page.getByRole('heading', { name: `${goalName} second` }) })
      .first()
      .locator('[name="id"]')
      .first()
      .inputValue(),
  );
  await page.goto('/today');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Add to Today' }).click();
    await page.getByLabel('Search tasks').fill(names[i]);
    await page.getByRole('button', { name: 'Add to slot' }).click();
    await expect(page.locator('ol > li').nth(i)).toContainText(names[i]);
    await page.reload();
  }
  const slots = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: /three wins/ }) })
    .locator('ol > li');
  await expect(slots.nth(0)).toContainText(names[0]);
  await expect(slots.nth(1)).toContainText(names[1]);
  await expect(slots.nth(2)).toContainText(names[2]);
  await slots.nth(1).getByRole('button', { name: 'Move up' }).click();
  await expect(slots.nth(0)).toContainText(names[1]);
  await page.getByRole('button', { name: 'Add to Today' }).click();
  await page.getByLabel('Search tasks').fill(names[3]);
  await page.getByLabel('Priority slot').selectOption('2');
  await page.getByLabel(`Replace ${names[0]}`).check();
  await page.getByRole('button', { name: 'Replace priority' }).click();
  await expect(slots.nth(1)).toContainText(names[3]);
  await slots.nth(1).getByRole('button', { name: 'Remove priority' }).click();
  await expect(slots.nth(1)).toContainText(names[2]);
  await slots.nth(0).getByRole('button', { name: 'Complete' }).click();
  await expect(slots.nth(0)).toContainText('done');
  await slots.nth(0).getByRole('button', { name: 'Reopen' }).click();
  await expect(slots.nth(0)).toContainText('todo');
  for (const mode of ['reduced', 'minimum', 'normal']) {
    await page.getByLabel('Day mode').selectOption(mode);
    await page.getByRole('button', { name: 'Update mode' }).click();
    await page.reload();
    await expect(slots.nth(0)).toContainText(names[1]);
    await expect(slots.nth(1)).toContainText(names[2]);
  }
  await slots.nth(1).getByText('Reschedule or swap').click();
  const reschedule = slots
    .nth(1)
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Reschedule' }) });
  await reschedule.locator('[name="scheduledDate"]').fill('2026-10-09');
  await reschedule.getByRole('button', { name: 'Reschedule' }).click();
  await expect(slots.nth(1)).toContainText('Empty slot');
  await page.reload();
  await expect(slots.nth(0)).toContainText(names[1]);
  await expect(slots.nth(1)).toContainText('Empty slot');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Add to Today' })).toBeVisible();
  await page.goto('/goals');
  await expect(page.getByText('Edit project')).toBeVisible();
  const editedGoalRow = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: `${goalName} edited` }) })
    .first();
  await editedGoalRow.getByText('Archive goal').first().click();
  await editedGoalRow.getByRole('checkbox', { name: /Keep linked work/ }).check();
  await editedGoalRow.getByRole('button', { name: 'Archive goal' }).click();
  await page.getByText('Archived goals').click();
  await expect(page.getByRole('button', { name: 'Restore goal' })).toBeVisible();
  await page.getByRole('button', { name: 'Restore goal' }).click();
  await expect(page.getByRole('heading', { name: `${goalName} edited` })).toBeVisible();
  const editedProjectRow = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: `${projectName} edited` }) })
    .first();
  await editedProjectRow.getByText('Archive project').first().click();
  await editedProjectRow.getByRole('checkbox', { name: /Keep tasks/ }).check();
  await editedProjectRow.getByRole('button', { name: 'Archive project' }).click();
  await page.getByText('Archived projects').click();
  await page.getByRole('button', { name: 'Restore project' }).click();
  await expect(page.getByRole('heading', { name: `${projectName} edited` })).toBeVisible();
});

test('future weekday and metadata edits keep a completed earlier occurrence', async ({ page }) => {
  test.setTimeout(180_000);
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const tag = Date.now();
  const title = `P1 series ${tag}`;
  await page.goto('/register');
  await page.getByLabel('Your name').fill('P1 Schedule Tester');
  await page.getByLabel('Email address').fill(`p1-series-${tag}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Editing-test-password-42');
  await page.getByLabel('Confirm password').fill('Editing-test-password-42');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 90_000 });
  await page.goto('/week?date=2026-10-05');
  const add = page.locator('form').filter({ has: page.getByRole('button', { name: 'Add block' }) });
  await add.locator('[name="title"]').fill(title);
  await add.locator('[name="localStartTime"]').fill('09:00');
  await add.locator('[name="localEndTime"]').fill('10:00');
  for (const day of ['1', '2', '3', '4'])
    await add.locator(`[name="weekday"][value="${day}"]`).uncheck();
  await add.locator('[name="startDate"]').fill('2026-10-05');
  await add.getByRole('button', { name: 'Add block' }).click();
  const previous = page.locator('article').filter({ hasText: title }).first();
  await previous.getByRole('button', { name: 'Complete' }).click();
  await expect(previous).toContainText('completed');
  const series = page
    .locator('li')
    .filter({ hasText: title })
    .filter({ has: page.getByText('Edit series details') })
    .first();
  await series.getByText('Edit series details').click();
  const edit = series
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save block' }) });
  await edit.locator('[name="effectiveDate"]').fill('2026-10-09');
  await edit.locator('[name="title"]').fill(`${title} changed`);
  await edit.locator('[name="localStartTime"]').fill('14:00');
  await edit.locator('[name="localEndTime"]').fill('15:00');
  await edit.locator('[name="weekday"][value="0"]').uncheck();
  await edit.locator('[name="weekday"][value="1"]').check();
  await edit.getByRole('button', { name: 'Check conflicts' }).click();
  await expect(edit.getByRole('status')).toContainText('No conflicts detected');
  await expect(edit.locator('[name="localStartTime"]')).toHaveValue('14:00');
  await edit.getByRole('button', { name: 'Save block' }).click();
  await expect(series.getByRole('status')).toContainText('Time block edited');
  await page.reload();
  await expect(page.locator('article').filter({ hasText: title }).first()).toContainText(
    'completed',
  );
  await expect(page.locator('article').filter({ hasText: title }).first()).toContainText('09:00');
  await page.goto('/week?date=2026-10-12');
  await expect(page.locator('article').filter({ hasText: `${title} changed` })).toHaveCount(1);
  await expect(
    page
      .locator('article')
      .filter({ hasText: `${title} changed` })
      .first(),
  ).toContainText('14:00');

  const otherBlock = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Add block' }) });
  await otherBlock.locator('[name="title"]').fill(`Conflicting block ${tag}`);
  await otherBlock.locator('[name="localStartTime"]').fill('16:00');
  await otherBlock.locator('[name="localEndTime"]').fill('17:00');
  await otherBlock.locator('[name="startDate"]').fill('2026-10-12');
  for (const day of ['0', '2', '3', '4'])
    await otherBlock.locator(`[name="weekday"][value="${day}"]`).uncheck();
  await otherBlock.getByRole('button', { name: 'Add block' }).click();
  await expect(page.getByRole('heading', { name: `Conflicting block ${tag}` })).toBeVisible();
  const changedSeries = page
    .locator('li')
    .filter({ hasText: `${title} changed` })
    .filter({ has: page.getByText('Edit series details') })
    .first();
  await changedSeries.getByText('Edit series details').click();
  const preview = changedSeries
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Save block' }) });
  await preview.locator('[name="effectiveDate"]').fill('2026-10-19');
  await preview.locator('[name="localStartTime"]').fill('16:00');
  await preview.locator('[name="localEndTime"]').fill('17:00');
  await preview.getByRole('button', { name: 'Check conflicts' }).click();
  await expect(preview.getByRole('alert')).toContainText('Overlaps');
  await page.goto('/week?date=2026-10-19');
  await expect(
    page
      .locator('article')
      .filter({ hasText: `${title} changed` })
      .first(),
  ).toContainText('14:00');
});

test('a second account cannot edit another account’s goal, project, task, priority, or block', async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  test.skip(!process.env.HABITFLOW_E2E_ISOLATED, 'Requires an isolated test database.');
  const tag = Date.now();
  async function register(target: typeof page, name: string) {
    await target.goto('/register');
    await target.getByLabel('Your name').fill(name);
    await target
      .getByLabel('Email address')
      .fill(`${name.toLowerCase().replaceAll(' ', '-')}-${tag}@example.test`);
    await target.getByLabel('Password', { exact: true }).fill('Editing-test-password-42');
    await target.getByLabel('Confirm password').fill('Editing-test-password-42');
    await target.getByRole('button', { name: 'Create account' }).click();
    await expect(target).toHaveURL(/\/dashboard/, { timeout: 90_000 });
  }
  async function createRecords(target: typeof page, prefix: string) {
    await target.goto('/goals');
    await target.getByText('Add a goal').click();
    const goalCreate = target
      .locator('form')
      .filter({ has: target.getByRole('button', { name: 'Create goal' }) });
    await goalCreate.locator('[name="title"]').fill(`${prefix} goal`);
    await goalCreate.getByRole('button', { name: 'Create goal' }).click();
    const goalRow = target
      .locator('li')
      .filter({ has: target.getByRole('heading', { name: `${prefix} goal` }) })
      .first();
    await goalRow.getByText('Edit goal').click();
    const goalEdit = goalRow
      .locator('form')
      .filter({ has: target.getByRole('button', { name: 'Save goal' }) });
    const goalId = await goalEdit.locator('[name="id"]').inputValue();

    await target.getByText('Add a project').click();
    const projectCreate = target
      .locator('form')
      .filter({ has: target.getByRole('button', { name: 'Create project' }) });
    await projectCreate.locator('[name="name"]').fill(`${prefix} project`);
    await projectCreate.getByRole('button', { name: 'Create project' }).click();
    const projectRow = target
      .locator('li')
      .filter({ has: target.getByRole('heading', { name: `${prefix} project` }) })
      .first();
    await projectRow.getByText('Edit project').click();
    const projectEdit = projectRow
      .locator('form')
      .filter({ has: target.getByRole('button', { name: 'Save project' }) });
    const projectId = await projectEdit.locator('[name="id"]').inputValue();

    await target.getByText('Add a task').click();
    const taskCreate = target
      .locator('form')
      .filter({ has: target.getByRole('button', { name: 'Add task' }) });
    await taskCreate.locator('[name="title"]').fill(`${prefix} task`);
    await taskCreate.getByRole('button', { name: 'Add task' }).click();
    const taskRow = target
      .locator('li')
      .filter({ has: target.getByRole('heading', { name: `${prefix} task` }) })
      .first();
    await taskRow.getByText('Edit task').click();
    const taskEdit = taskRow
      .locator('form')
      .filter({ has: target.getByRole('button', { name: 'Save task' }) });
    const taskId = await taskEdit.locator('[name="id"]').inputValue();

    await target.goto('/week?date=2026-10-05');
    const blockCreate = target
      .locator('form')
      .filter({ has: target.getByRole('button', { name: 'Add block' }) });
    await blockCreate.locator('[name="title"]').fill(`${prefix} block`);
    await blockCreate.locator('[name="localStartTime"]').fill('09:00');
    await blockCreate.locator('[name="localEndTime"]').fill('10:00');
    await blockCreate.locator('[name="startDate"]').fill('2026-10-05');
    await blockCreate.getByRole('button', { name: 'Add block' }).click();
    const blockRow = target
      .locator('li')
      .filter({ hasText: `${prefix} block` })
      .filter({ has: target.getByText('Edit series details') })
      .first();
    await blockRow.getByText('Edit series details').click();
    const blockEdit = blockRow
      .locator('form')
      .filter({ has: target.getByRole('button', { name: 'Save block' }) });
    const blockId = await blockEdit.locator('[name="id"]').inputValue();
    return { goalId, projectId, taskId, blockId };
  }

  await register(page, 'Owner P1');
  const owner = await createRecords(page, `Owner ${tag}`);
  const otherContext = await browser.newContext({ baseURL: 'http://localhost:3100' });
  try {
    const other = await otherContext.newPage();
    await register(other, 'Other P1');
    await createRecords(other, `Other ${tag}`);
    await other.goto('/goals');
    const otherGoal = other
      .locator('li')
      .filter({ has: other.getByRole('heading', { name: `Other ${tag} goal` }) })
      .first();
    await otherGoal.getByText('Edit goal').click();
    const goalForm = otherGoal
      .locator('form')
      .filter({ has: other.getByRole('button', { name: 'Save goal' }) });
    await goalForm.locator('[name="id"]').evaluate((input: HTMLInputElement, id) => {
      input.value = id;
    }, owner.goalId);
    await goalForm.getByRole('button', { name: 'Save goal' }).click();
    await expect(goalForm.getByRole('alert')).toContainText('Goal not found');

    const otherProject = other
      .locator('li')
      .filter({ has: other.getByRole('heading', { name: `Other ${tag} project` }) })
      .first();
    await otherProject.getByText('Edit project').click();
    const projectForm = otherProject
      .locator('form')
      .filter({ has: other.getByRole('button', { name: 'Save project' }) });
    await projectForm.locator('[name="id"]').evaluate((input: HTMLInputElement, id) => {
      input.value = id;
    }, owner.projectId);
    await projectForm.getByRole('button', { name: 'Save project' }).click();
    await expect(projectForm.getByRole('alert')).toContainText('Project not found');

    const otherTask = other
      .locator('li')
      .filter({ has: other.getByRole('heading', { name: `Other ${tag} task` }) })
      .first();
    await otherTask.getByText('Edit task').click();
    const taskForm = otherTask
      .locator('form')
      .filter({ has: other.getByRole('button', { name: 'Save task' }) });
    await taskForm.locator('[name="id"]').evaluate((input: HTMLInputElement, id) => {
      input.value = id;
    }, owner.taskId);
    await taskForm.getByRole('button', { name: 'Save task' }).click();
    await expect(taskForm.getByRole('alert')).toContainText('Task not found');

    await other.goto('/today');
    await other.getByRole('button', { name: 'Add to Today' }).click();
    await other.getByLabel('Search tasks').fill(`Other ${tag} task`);
    const priorityForm = other
      .locator('form')
      .filter({ has: other.getByRole('button', { name: 'Add to slot' }) });
    await priorityForm.locator('[name="id"]').evaluate((input: HTMLInputElement, id) => {
      input.value = id;
    }, owner.taskId);
    await priorityForm.getByRole('button', { name: 'Add to slot' }).click();
    await expect(priorityForm.getByRole('alert')).toContainText('Task is unavailable');

    await other.goto('/week?date=2026-10-05');
    const otherBlock = other
      .locator('li')
      .filter({ hasText: `Other ${tag} block` })
      .filter({ has: other.getByText('Edit series details') })
      .first();
    await otherBlock.getByText('Edit series details').click();
    const blockForm = otherBlock
      .locator('form')
      .filter({ has: other.getByRole('button', { name: 'Save block' }) });
    await blockForm.locator('[name="id"]').evaluate((input: HTMLInputElement, id) => {
      input.value = id;
    }, owner.blockId);
    await blockForm.locator('[name="effectiveDate"]').fill('2026-10-09');
    await blockForm.getByRole('button', { name: 'Save block' }).click();
    await expect(blockForm.getByRole('alert')).toContainText('Time block not found');
  } finally {
    await otherContext.close();
  }
});
