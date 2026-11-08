import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
const data = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('sentinel.v2.data')!).data);
const dialog = (page: Page) => page.getByRole('dialog');
async function choose(page: Page, id: string, name: string | RegExp) {
  await page.locator(id).click(); await page.getByRole('option', { name, exact: typeof name === 'string' }).click();
}
async function course(page: Page, name: string) {
  await page.getByRole('tab', {name:'Courses', exact:true}).click();
  await page.getByRole('button', {name:'Add course',exact:true}).first().click();
  await page.locator('#course-name').fill(name);
  await dialog(page).getByRole('button', {name:'Add course',exact:true}).click();
}
async function assignment(page: Page, title = 'Audit essay') {
  await page.getByRole('tab', {name:'Plan',exact:true}).click();
  await page.getByRole('button', {name:'New task',exact:true}).first().click();
  await page.locator('#task-title').fill(title);
  await choose(page, '#task-course', /Writing/);
  await choose(page, '#task-priority', 'High');
  await page.locator('#task-deadline').click();
  await page.getByRole('button', {name:'Monday, 9 November 2026',exact:true}).click();
  await page.locator('#task-duration').fill('90');
  await dialog(page).getByRole('button', {name:'Create task',exact:true}).click();
}
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-11-02T08:00:00-06:00')});
  await page.goto('/');
  await page.getByRole('button', {name:'Skip setup',exact:true}).click();
});
test('empty first use, course and assignment lifecycle, scheduling and persistence', async ({page}) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  expect((await data(page)).courses).toEqual([]); expect((await data(page)).tasks).toEqual([]);
  await page.goto('/planner'); await course(page, 'Writing');
  await page.getByRole('button', {name:'Edit: Writing',exact:true}).click();
  await page.locator('#course-code').fill('ENG101');
  await dialog(page).getByRole('button', {name:/Save changes|Save task|Save entry|Save course|^Save$/,exact:true}).click();
  await assignment(page);
  await expect.poll(async () => (await data(page)).tasks[0]?.priority).toBe('high');
  expect((await data(page)).tasks[0].estimatedMinutes).toBe(90);
  await expect(page.getByRole('button', {name:/Audit essay.*09:00/})).toBeVisible();
  await page.reload(); await expect(page.getByRole('button', {name:'Edit: Audit essay',exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Edit: Audit essay',exact:true}).click();
  await page.locator('#task-completed').fill('30'); await page.locator('#task-duration').fill('120');
  await choose(page, '#task-priority', 'Low');
  await dialog(page).getByRole('button', {name:/Save changes|Save task|Save entry|Save course|^Save$/,exact:true}).click();
  expect((await data(page)).tasks[0].completedMinutes).toBe(30);
  await page.getByRole('checkbox', {name:'Mark as complete',exact:true}).click();
  expect((await data(page)).tasks[0].completed).toBe(true);
  await page.getByRole('button', {name:'Next week',exact:true}).click();
  await page.getByRole('checkbox', {name:'Mark as not complete',exact:true}).click();
  expect((await data(page)).tasks[0].completed).toBe(false);
  await page.getByRole('tab', {name:'Courses',exact:true}).click();
  await page.getByRole('button', {name:'Archive: Writing',exact:true}).click();
  expect((await data(page)).courses[0].archived).toBe(true);
  await page.getByRole('button', {name:'Restore: Writing',exact:true}).click();
  await page.getByRole('button', {name:'Delete: Writing',exact:true}).click();
  await dialog(page).getByRole('button', {name:/Keep.*assignment/}).click();
  expect((await data(page)).tasks).toHaveLength(1); expect((await data(page)).tasks[0].courseId).toBe('');
  await course(page,'Writing');
  await page.getByRole('tab', {name:'Plan',exact:true}).click();
  await page.getByRole('button', {name:'Edit: Audit essay',exact:true}).click();
  await choose(page,'#task-course',/Writing/);
  await dialog(page).getByRole('button',{name:/Save changes|Save task|Save entry|Save course|^Save$/,exact:true}).click();
  await page.getByRole('tab', {name:'Courses',exact:true}).click();
  await page.getByRole('button',{name:'Delete: Writing',exact:true}).click();
  await dialog(page).getByRole('button',{name:/Delete.*assignment/}).click();
  expect((await data(page)).tasks).toHaveLength(0); expect((await data(page)).courses).toHaveLength(0);
  expect(errors).toEqual([]);
});
test('habit CRUD, themes, languages, export/import, demo and clear confirmations', async ({page}) => {
  await page.goto('/habits');
  await page.getByRole('button',{name:/Add entry/}).first().click();
  await page.locator('#usage-app').fill('Audit social'); await page.locator('#usage-minutes').fill('120');
  await dialog(page).getByRole('button',{name:/Add entry|Save entry/}).click();
  expect((await data(page)).usage[0].minutes).toBe(120);
  await page.getByRole('button',{name:'Edit: Audit social',exact:true}).click();
  await page.locator('#usage-minutes').fill('60');
  await dialog(page).getByRole('button',{name:/Save changes|Save task|Save entry|Save course|^Save$/,exact:true}).click();
  await page.reload(); expect((await data(page)).usage[0].minutes).toBe(60);
  await page.locator('#habit-reduction').fill('600');
  await expect(page.getByText('1 h', {exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'Delete: Audit social',exact:true}).click();
  await dialog(page).getByRole('button',{name:'Delete',exact:true}).click();
  expect((await data(page)).usage).toHaveLength(0);
  await page.goto('/settings');
  await page.locator('#max-daily').fill('180');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  expect((await data(page)).preferences.maxDailyStudyMinutes).toBe(180);
  for (const theme of ['Dark','Light','System']) {
    await page.getByRole('radio',{name:new RegExp('^'+theme)}).click();
    await expect.poll(async () => (await data(page)).preferences.theme).toBe(theme.toLowerCase());
  }
  for (const [label,code] of [['Français','fr'],['Español','es'],['Português','pt'],['简体中文','zh-CN'],['English','en']]) {
    await page.getByRole('radio',{name:new RegExp(label)}).click();
    await expect(page.locator('html')).toHaveAttribute('lang',code);
  }
  await page.getByRole('button',{name:'Load demo data',exact:true}).click();
  expect((await data(page)).tasks).toHaveLength(0);
  await dialog(page).getByRole('button',{name:'Load demo data',exact:true}).click();
  await expect.poll(async () => (await data(page)).tasks.length).toBe(9);
  const backup = await data(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{name:'Download',exact:true}).click();
  const download = await downloadPromise; expect(download.suggestedFilename()).toMatch(/\.json$/);
  await page.locator('#json-import').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({data:backup}))});
  await dialog(page).getByRole('button',{name:'Merge data'}).click();
  expect((await data(page)).tasks).toHaveLength(9);
  await page.locator('#csv-import-courses').setInputFiles({name:'courses.csv',mimeType:'text/csv',buffer:Buffer.from('name,code\nAudit Course,AUD101\n')});
  await dialog(page).getByRole('button',{name:/Import.*valid|Confirm import|Import rows/}).click();
  expect((await data(page)).courses.some((c: {name:string})=>c.name==='Audit Course')).toBe(true);
  await page.getByRole('button',{name:'Reset demo data',exact:true}).click();
  await dialog(page).getByRole('button',{name:'Reset demo data',exact:true}).click();
  expect((await data(page)).courses).toHaveLength(4);
  await page.getByRole('button',{name:'Clear all data',exact:true}).click();
  await dialog(page).getByRole('button',{name:'Cancel',exact:true}).click();
  expect((await data(page)).tasks).toHaveLength(9);
});
test('commitments, recurring exceptions, series edits and simulation apply/reset', async ({page}) => {
  await page.goto('/planner');
  async function commitment(title: string, category: string, start: string, end: string, weekly = false) {
    await page.getByRole('button',{name:'New commitment',exact:true}).first().click();
    await page.locator('#commitment-title').fill(title);
    await choose(page,'#commitment-category',category);
    await page.locator('#commitment-start').fill(start); await page.locator('#commitment-end').fill(end);
    if (weekly) await choose(page,'#commitment-recurrence','Every week');
    await dialog(page).getByRole('button',{name:'Add commitment',exact:true}).click();
  }
  await commitment('Lecture','Class','2026-10-26T09:00','2026-10-26T11:00',true);
  await page.goto('/simulation');
  await page.getByRole('tab',{name:'Remove a commitment',exact:true}).click();
  await page.locator('#remove-commitment').click();
  await expect(page.getByRole('option',{name:/Lecture/})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/planner');
  await commitment('Shift','Work','2026-11-02T10:00','2026-11-02T12:00');
  await commitment('Lunch','Personal','2026-11-02T12:00','2026-11-02T13:00');
  await expect(page.getByText(/“Lecture” overlaps “Shift”|“Shift” overlaps “Lecture”/)).toBeVisible();
  await page.getByRole('button',{name:'Edit: Lecture',exact:true}).click();
  // Series edit must retain the original anchor rather than truncate history to this week.
  await expect(page.locator('#commitment-start')).toHaveValue('2026-10-26T09:00');
  await page.locator('#commitment-title').fill('Lecture revised');
  await dialog(page).getByRole('button',{name:'Save commitment',exact:true}).click();
  expect((await data(page)).commitments.find((c:{title:string})=>c.title==='Lecture revised').start).toContain('2026-10-26');
  await page.getByRole('button',{name:'Edit: Lecture revised',exact:true}).click();
  await choose(page,'#commitment-scope','This occurrence only');
  await expect(page.locator('#commitment-start')).toHaveValue('2026-11-02T09:00');
  await page.locator('#commitment-title').fill('Detached lecture');
  await dialog(page).getByRole('button',{name:'Save commitment',exact:true}).click();
  expect((await data(page)).commitments.find((c:{title:string})=>c.title==='Lecture revised').exceptions).toContain('2026-11-02');
  await page.getByRole('button',{name:'Edit: Lunch',exact:true}).click();
  await page.locator('#commitment-title').fill('Lunch revised');
  await dialog(page).getByRole('button',{name:'Save commitment',exact:true}).click();
  await page.getByRole('button',{name:'Delete: Lunch revised',exact:true}).click();
  await dialog(page).getByRole('button',{name:'Delete',exact:true}).click();
  await page.goto('/simulation');
  await page.getByRole('tab',{name:'Remove a commitment',exact:true}).click();
  await page.locator('#remove-commitment').click();
  await expect(page.getByRole('option',{name:/Lecture revised/})).toHaveCount(0); // exception this week
  await page.keyboard.press('Escape');
  await page.getByRole('tab',{name:/Add.*shift/}).click();
  await page.locator('#shift-title').fill('Simulated shift');
  await page.locator('#shift-date').fill('2026-11-03');
  await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
  expect((await data(page)).commitments.some((c:{title:string})=>c.title==='Simulated shift')).toBe(false);
  await page.getByRole('button',{name:'Reset simulation',exact:true}).click();
  await page.locator('#shift-title').fill('Applied shift');
  await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
  await page.getByRole('button',{name:'Apply scenario',exact:true}).click();
  await dialog(page).getByRole('button',{name:'Apply changes',exact:true}).click();
  expect((await data(page)).commitments.some((c:{title:string})=>c.title==='Applied shift')).toBe(true);
});
test('six routes fit five viewport widths with demo data', async ({page}) => {
  await page.goto('/settings'); await page.getByRole('button',{name:'Load demo data',exact:true}).click();
  await dialog(page).getByRole('button',{name:'Load demo data',exact:true}).click();
  for (const width of [320,375,768,1024,1440]) {
    await page.setViewportSize({width,height:900});
    for (const route of ['/','/planner','/simulation','/habits','/insights','/settings']) {
      await page.goto(route); await expect(page.locator('main')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  }
});

test('JSON replace, CSV assignment/commitment imports and downloadable CSV exports', async ({page}) => {
  await page.goto('/settings');
  const backup = await data(page);
  backup.preferences.displayName = 'Restored student';
  await page.locator('#json-import').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({data:backup}))});
  await dialog(page).getByRole('radio',{name:/Replace/}).click();
  await dialog(page).getByRole('button',{name:'Replace everything',exact:true}).click();
  expect((await data(page)).preferences.displayName).toBe('Restored student');
  for (const [kind,text] of [
    ['tasks','title,deadline,estimatedMinutes\nImported essay,2026-11-05 23:59,90\n'],
    ['commitments','title,start,end\nImported shift,2026-11-03 09:00,2026-11-03 10:00\n'],
  ]) {
    await page.locator(`#csv-import-${kind}`).setInputFiles({name:kind+'.csv',mimeType:'text/csv',buffer:Buffer.from(text)});
    await dialog(page).getByRole('button',{name:'Import rows',exact:true}).click();
    expect((await data(page))[kind]).toHaveLength(1);
  }
  const exports = page.getByRole('button',{name:'Export CSV',exact:true});
  for (let i=0;i<await exports.count();i++) {
    const pending = page.waitForEvent('download'); await exports.nth(i).click();
    expect((await pending).suggestedFilename()).toMatch(/\.csv$/);
  }
  await page.reload(); expect((await data(page)).tasks).toHaveLength(1);
});
test('deadline edits expose later unfinished work; assignment and recurring deletion semantics', async ({page}) => {
  await page.goto('/planner'); await course(page,'Writing'); await assignment(page);
  await page.getByRole('button',{name:'Edit: Audit essay',exact:true}).click();
  await page.locator('#task-deadline').click();
  await page.getByRole('button',{name:'Next month',exact:true}).click();
  await page.locator('[data-day="2026-12-09"]').click();
  await dialog(page).getByRole('button',{name:'Save task',exact:true}).click();
  await expect(page.getByText(/Later coursework is not included/)).toBeVisible();
  await expect(page.getByRole('button',{name:/Audit essay.*09:00/})).toHaveCount(0);
  expect((await data(page)).tasks[0].completed).toBe(false);
  await page.getByRole('button',{name:'Delete: Audit essay',exact:true}).click();
  await dialog(page).getByRole('button',{name:'Delete',exact:true}).click();
  expect((await data(page)).tasks).toHaveLength(0);
  await page.getByRole('button',{name:'New commitment',exact:true}).first().click();
  await page.locator('#commitment-title').fill('Weekly class');
  await page.locator('#commitment-start').fill('2026-11-02T09:00');
  await page.locator('#commitment-end').fill('2026-11-02T10:00');
  await choose(page,'#commitment-recurrence','Every week');
  await dialog(page).getByRole('button',{name:'Add commitment',exact:true}).click();
  await page.getByRole('button',{name:'Delete: Weekly class',exact:true}).click();
  await dialog(page).getByRole('button',{name:'Delete this occurrence',exact:true}).click();
  expect((await data(page)).commitments[0].exceptions).toContain('2026-11-02');
  await page.getByRole('button',{name:'Next week',exact:true}).click();
  await page.getByRole('button',{name:'Delete: Weekly class',exact:true}).click();
  await dialog(page).getByRole('button',{name:'Delete the entire series',exact:true}).click();
  expect((await data(page)).commitments).toHaveLength(0);
});
