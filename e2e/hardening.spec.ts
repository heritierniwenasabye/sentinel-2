import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
const stored = (page:Page) => page.evaluate(()=>JSON.parse(localStorage.getItem('sentinel.v2.data')!).data);
const dialog = (page:Page) => page.getByRole('dialog');
async function select(page:Page,id:string,label:string|RegExp){await page.locator(id).click();await page.getByRole('option',{name:label,exact:typeof label==='string'}).click();}
async function boot(page:Page,skip=true){await page.clock.install({time:new Date('2026-11-02T08:00:00-06:00')});await page.goto('/');if(skip)await page.getByRole('button',{name:'Skip setup',exact:true}).click();}
async function addCourse(page:Page,name:string){await page.getByRole('tab',{name:'Courses',exact:true}).click();await page.getByRole('button',{name:'Add course',exact:true}).first().click();await page.locator('#course-name').fill(name);await dialog(page).getByRole('button',{name:'Add course',exact:true}).click();}
async function newTask(page:Page,title:string,course:string,day:string,priority:string,minutes:number){
  await page.getByRole('tab',{name:'Plan',exact:true}).click();await page.getByRole('button',{name:'New task',exact:true}).first().click();
  await page.locator('#task-title').fill(title);await select(page,'#task-course',course);await select(page,'#task-priority',priority);
  await page.locator('#task-deadline').click();await page.locator(`[data-day="${day}"]`).click();await page.locator('#task-duration').fill(String(minutes));await dialog(page).getByRole('button',{name:'Create task',exact:true}).click();
}
async function newCommitment(page:Page,title:string,category:string,start:string,end:string,weekly=false){
  await page.getByRole('button',{name:'New commitment',exact:true}).first().click();await page.locator('#commitment-title').fill(title);await select(page,'#commitment-category',category);
  await page.locator('#commitment-start').fill(start);await page.locator('#commitment-end').fill(end);if(weekly)await select(page,'#commitment-recurrence','Every week');await dialog(page).getByRole('button',{name:'Add commitment',exact:true}).click();
}

test('complete student journey on mobile, including reset and actual exported-file restore',async({page})=>{
  await page.setViewportSize({width:375,height:900});await boot(page,false);
  await page.locator('#onboarding-name').fill('Student');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.locator('#onboarding-max-daily').fill('180');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.locator('#onboarding-course-name').fill('Writing');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.locator('#onboarding-task-title').fill('Essay');await page.getByRole('button',{name:'Start planning',exact:true}).click();
  await expect(dialog(page)).toHaveCount(0);expect((await stored(page)).courses).toHaveLength(1);
  await page.goto('/planner');await addCourse(page,'Math');await addCourse(page,'Computing');
  for(const [title,course,day,priority,minutes] of [['Problem set','Math','2026-11-03','High',120],['Project','Computing','2026-11-06','Medium',180],['Reading','Writing','2026-11-04','Low',45],['Quiz prep','Math','2026-11-05','High',30],['Lab','Computing','2026-11-09','Medium',240]] as const)await newTask(page,title,course,day,priority,minutes);
  expect((await stored(page)).tasks).toHaveLength(6);
  await newCommitment(page,'Math lecture','Class','2026-11-02T09:00','2026-11-02T10:30',true);
  await newCommitment(page,'Computing lecture','Class','2026-11-03T09:00','2026-11-03T11:00',true);
  await newCommitment(page,'Campus shift','Work','2026-11-03T16:00','2026-11-03T20:00');await newCommitment(page,'Cafe shift','Work','2026-11-05T16:00','2026-11-05T20:00');
  await newCommitment(page,'Gym','Personal','2026-11-04T18:00','2026-11-04T19:00');
  await page.getByRole('button',{name:'Edit: Reading',exact:true}).click();await page.locator('#task-deadline').click();await page.locator('[data-day="2026-11-06"]').click();await select(page,'#task-priority','High');await page.locator('#task-completed').fill('30');await dialog(page).getByRole('button',{name:'Save task',exact:true}).click();
  await page.getByRole('checkbox',{name:'Mark as complete',exact:true}).first().click();await page.getByRole('checkbox',{name:'Mark as not complete',exact:true}).click();
  await page.getByRole('tab',{name:'Courses',exact:true}).click();await page.getByRole('button',{name:'Archive: Math',exact:true}).click();await page.getByRole('button',{name:'Restore: Math',exact:true}).click();
  await page.getByRole('button',{name:'Edit: Math',exact:true}).click();await page.locator('#course-instructor').fill('Instructor');await dialog(page).getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('tab',{name:'Plan',exact:true}).click();await page.getByRole('button',{name:'Edit: Gym',exact:true}).click();await page.locator('#commitment-title').fill('Gym revised');await dialog(page).getByRole('button',{name:'Save commitment',exact:true}).click();await page.getByRole('button',{name:'Delete: Gym revised',exact:true}).click();await dialog(page).getByRole('button',{name:'Delete',exact:true}).click();
  await page.goto('/simulation');const baseline=await stored(page);await page.locator('#shift-title').fill('Extra shift');await page.locator('#shift-date').fill('2026-11-04');await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
  expect(await stored(page)).toEqual(baseline);await page.getByRole('button',{name:'Apply scenario',exact:true}).click();await dialog(page).getByRole('button',{name:'Keep simulating',exact:true}).click();expect(await stored(page)).toEqual(baseline);
  await page.getByRole('button',{name:'Reset simulation',exact:true}).click();await page.locator('#shift-title').fill('Accepted shift');await page.getByRole('button',{name:'Add to comparison',exact:true}).click();await page.getByRole('button',{name:'Apply scenario',exact:true}).click();await dialog(page).getByRole('button',{name:'Apply changes',exact:true}).click();
  await page.goto('/habits');await page.getByRole('button',{name:'Add entry',exact:true}).click();await page.locator('#usage-app').fill('Social');await page.locator('#usage-minutes').fill('90');await dialog(page).getByRole('button',{name:'Add entry',exact:true}).click();await page.getByRole('button',{name:'Edit: Social',exact:true}).click();await page.locator('#usage-minutes').fill('60');await dialog(page).getByRole('button',{name:'Save entry',exact:true}).click();
  await page.getByRole('button',{name:'Add usage goal',exact:true}).click();await page.locator('#goal-app').fill('Social');await page.locator('#goal-limit').fill('45');await dialog(page).getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByText(/15 min over the limit/)).toBeVisible();
  await page.goto('/settings');await page.locator('#max-daily').fill('210');await page.getByRole('button',{name:'Save',exact:true}).click();
  for(const label of ['Français','Español','Português','简体中文','English'])await page.getByRole('radio',{name:new RegExp(label)}).click();
  for(const theme of ['Dark','Light','System'])await page.getByRole('radio',{name:new RegExp('^'+theme)}).click();
  const expected=await stored(page);const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download',exact:true}).click();const downloaded=await downloading;const bytes=await readFile((await downloaded.path())!);
  await page.getByRole('button',{name:'Clear all data',exact:true}).click();await dialog(page).getByRole('button',{name:'Clear everything',exact:true}).click();expect((await stored(page)).tasks).toHaveLength(0);
  await page.locator('#json-import').setInputFiles({name:'export.json',mimeType:'application/json',buffer:bytes});await dialog(page).getByRole('radio',{name:/Replace/}).click();await dialog(page).getByRole('button',{name:'Replace everything',exact:true}).click();
  await page.reload();expect(await stored(page)).toEqual(expected);
  await page.goto('/planner');await expect(page.getByRole('button',{name:'Edit: Reading',exact:true})).toBeVisible();
});

test('goal validation, cancellation, edit/delete, missing-data status and persistence',async({page})=>{
  await boot(page);await page.goto('/habits');await page.getByRole('button',{name:'Add usage goal',exact:true}).click();await dialog(page).getByRole('button',{name:'Save',exact:true}).click();await expect(dialog(page).getByRole('alert')).toBeVisible();await page.locator('#goal-app').fill('Video');await page.locator('#goal-limit').fill('30');await dialog(page).getByRole('button',{name:'Cancel',exact:true}).click();expect((await stored(page)).usageGoals).toEqual([]);
  await page.getByRole('button',{name:'Add usage goal',exact:true}).click();await page.locator('#goal-app').fill('Video');await page.locator('#goal-limit').fill('30');await dialog(page).getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByText('No entry for today. Usage is unknown.',{exact:true})).toBeVisible();
  await page.reload();await page.getByRole('button',{name:'Edit: Video Usage goals',exact:true}).click();await page.locator('#goal-limit').fill('45');await dialog(page).getByRole('button',{name:'Save',exact:true}).click();expect((await stored(page)).usageGoals[0].dailyLimitMinutes).toBe(45);
  await page.getByRole('button',{name:'Delete: Video Usage goals',exact:true}).click();await dialog(page).getByRole('button',{name:'Cancel',exact:true}).click();expect((await stored(page)).usageGoals).toHaveLength(1);
  await page.getByRole('button',{name:'Delete: Video Usage goals',exact:true}).click();await dialog(page).getByRole('button',{name:'Delete',exact:true}).click();await page.reload();expect((await stored(page)).usageGoals).toEqual([]);
});

test('recovery downloads exact evidence and merges only after validation and confirmation',async({page})=>{
  await boot(page);const original=await stored(page);const damaged=JSON.stringify({...original,tasks:[{id:'valid',title:'Recovered',course:'',description:'',deadline:'2026-11-06T23:59:00',estimatedMinutes:90,priority:'high',completed:false,createdAt:'2026-11-02T08:00:00'},{id:'broken'}]});
  await page.evaluate(raw=>localStorage.setItem('sentinel.v2.data',raw),damaged);await page.goto('/settings');await expect(page.getByRole('heading',{name:'Data recovery',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Restore valid records',exact:true})).toBeDisabled();const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download raw backup',exact:true}).click();const downloaded=await downloading;expect(await readFile((await downloaded.path())!,'utf8')).toBe(damaged);
  await page.getByRole('button',{name:'Validate backup',exact:true}).click();await page.getByRole('button',{name:'Restore valid records',exact:true}).click();await dialog(page).getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Restore valid records',exact:true}).click();await dialog(page).getByRole('button',{name:'Restore valid records',exact:true}).click();await page.reload();expect((await stored(page)).tasks).toHaveLength(1);expect(await page.evaluate(()=>localStorage.getItem('sentinel.v2.data.corrupt'))).toBe(damaged);
});

test('failed writes warn visibly and keep current data usable; imports reject malformed and huge files',async({page})=>{
  await boot(page);await page.goto('/settings');
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};});
  await page.locator('#max-daily').fill('180');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByText(/changes cannot be saved|changes will not be saved|cannot.*save|storage/i).first()).toBeVisible();
  await page.locator('#json-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')});await expect(dialog(page)).toHaveCount(0);
  await page.locator('#csv-import-courses').setInputFiles({name:'huge.csv',mimeType:'text/csv',buffer:Buffer.alloc(5*1024*1024+1,'x')});await expect(page.getByText(/5 MB|5 MiB|too large|smaller than/i).first()).toBeVisible();await expect(dialog(page)).toHaveCount(0);
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download',exact:true}).click();const file=await downloading;expect(JSON.parse(await readFile((await file.path())!,'utf8')).data.preferences.maxDailyStudyMinutes).toBe(180);
  await page.reload();expect((await stored(page)).preferences.maxDailyStudyMinutes).toBe(240);
});

test('schedule refreshes after the clock advances without editing or reloading',async({page})=>{
  await boot(page);await page.goto('/planner');await addCourse(page,'Writing');await newTask(page,'Timed','Writing','2026-11-03','High',90);
  await expect(page.getByRole('button',{name:/Timed.*09:00/})).toBeVisible();await page.clock.fastForward(3*60*60*1000);
  await expect(page.getByRole('button',{name:/Timed.*09:00/})).toHaveCount(0);await expect(page.getByRole('button',{name:/Timed.*11:(00|30)/})).toBeVisible();
});

for(const theme of ['Light','Dark'])test(`automated WCAG checks on six routes and dialogs (${theme})`,async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await boot(page);await page.goto('/settings');await page.getByRole('button',{name:'Load demo data',exact:true}).click();await dialog(page).getByRole('button',{name:'Load demo data',exact:true}).click();await page.getByRole('radio',{name:new RegExp('^'+theme)}).click();
  const findings:unknown[]=[];
  for(const route of ['/','/planner','/simulation','/habits','/insights','/settings']){
    await page.goto(route);await expect(page.locator('main h1')).toBeVisible();await page.clock.runFor(250);const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();if(results.violations.length)findings.push({route,violations:results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))}))});
  }
  await page.goto('/habits');await page.getByRole('button',{name:'Add usage goal',exact:true}).click();await expect(page.locator('#goal-app')).toBeFocused();await page.clock.runFor(250);const modalResults=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();if(modalResults.violations.length)findings.push({dialog:'usage goal',violations:modalResults.violations});await page.keyboard.press('Tab');await expect(page.locator('#goal-limit')).toBeFocused();await page.keyboard.press('Escape');await expect(dialog(page)).toHaveCount(0);
  await info.attach('accessibility-findings',{body:JSON.stringify(findings,null,2),contentType:'application/json'});expect(findings).toEqual([]);
});

test('header menus, mobile navigation, keyboard radios, filters, validation and CSV templates',async({page})=>{
  await boot(page);await page.setViewportSize({width:375,height:900});
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await dialog(page).getByRole('link',{name:'Settings',exact:true}).click();await expect(dialog(page)).toHaveCount(0);
  await page.getByRole('button',{name:'Change language',exact:true}).click();await page.getByRole('menuitem',{name:'Français',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('lang','fr');
  await page.goto('/settings');await page.getByRole('radio',{name:/English/}).click();
  await page.getByRole('button',{name:'Change appearance',exact:true}).click();await page.getByRole('menuitem',{name:'Dark',exact:true}).click();await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('radio',{name:/^Dark/}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('radio',{name:/^System/})).toHaveAttribute('aria-checked','true');
  await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveClass(/dark/);await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.locator('#study-end').fill('08:00');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();expect((await stored(page)).preferences.studyEnd).toBe('21:00');await page.locator('#study-end').fill('21:00');
  for(let i=0;i<3;i++){const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Template',exact:true}).nth(i).click();expect((await downloading).suggestedFilename()).toContain('template');}
  await page.goto('/habits');await select(page,'[role="combobox"]','Education');await expect(page.getByText('No screen time recorded.',{exact:true}).first()).toBeVisible();
});

test('all simulation types combine without changing baseline until confirmed',async({page})=>{
  await boot(page);await page.goto('/planner');await addCourse(page,'Writing');await newTask(page,'Essay','Writing','2026-11-06','High',120);await newCommitment(page,'Old shift','Work','2026-11-03T09:00','2026-11-03T10:00');
  await page.goto('/habits');await page.getByRole('button',{name:'Add entry',exact:true}).click();await page.locator('#usage-app').fill('Social');await page.locator('#usage-minutes').fill('420');await dialog(page).getByRole('button',{name:'Add entry',exact:true}).click();
  const baseline=await stored(page);await page.goto('/simulation');
  await page.locator('#shift-title').fill('Extra shift');await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
  await page.getByRole('tab',{name:'Remove a commitment',exact:true}).click();await select(page,'#remove-commitment',/Old shift/);await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
  await page.getByRole('tab',{name:'Change a task',exact:true}).click();await select(page,'#change-task','Essay');await page.locator('#change-duration').fill('150');await page.locator('#change-deadline').fill('2026-11-05T23:59');await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
  await page.getByRole('tab',{name:'Reserve rest time',exact:true}).click();await page.locator('#rest-title').fill('Recovery time');await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
  await page.getByRole('tab',{name:'Change study availability',exact:true}).click();await page.locator('#window-start').fill('10:00');await page.locator('#window-end').fill('18:00');await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
  await page.getByRole('tab',{name:'Reduce screen time',exact:true}).click();await page.locator('#screen-reduction').fill('420');await page.getByRole('switch').click();await page.getByRole('button',{name:'Add to comparison',exact:true}).click();expect(await stored(page)).toEqual(baseline);
  await page.getByRole('button',{name:'Apply scenario',exact:true}).click();await dialog(page).getByRole('button',{name:'Keep simulating',exact:true}).click();expect(await stored(page)).toEqual(baseline);
  await page.getByRole('button',{name:'Apply scenario',exact:true}).click();await dialog(page).getByRole('button',{name:'Apply changes',exact:true}).click();await page.reload();const applied=await stored(page);expect(applied.tasks[0].estimatedMinutes).toBe(150);expect(applied.tasks[0].deadline).toContain('2026-11-05');expect(applied.commitments.some((c:{title:string})=>c.title==='Old shift')).toBe(false);expect(applied.preferences.studyStart).toBe('10:00');expect(applied.preferences.focusBonusPerDayMinutes).toBe(60);
});

test('course details, calendar keyboard, planner navigation, dashboard links and habit focus saving',async({page})=>{
  await boot(page);await page.goto('/planner');await addCourse(page,'Writing');
  await page.getByRole('button',{name:'Edit: Writing',exact:true}).click();await page.locator('#course-code').fill('W101');await page.locator('#course-instructor').fill('Tutor');await page.getByRole('radio',{name:'Green',exact:true}).click();
  await page.locator('#course-semester-start').click();await page.locator('[data-day="2026-11-02"]').click();await page.locator('#course-semester-end').click();await page.locator('[data-day="2026-11-03"]').click();await dialog(page).getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('button',{name:'Show assignments',exact:true}).click();await expect(page.getByText(/No assignments linked to this course/)).toBeVisible();
  await page.getByRole('tab',{name:'Plan',exact:true}).click();await page.getByRole('button',{name:'Previous week',exact:true}).click();await page.getByRole('button',{name:'This week',exact:true}).click();await expect(page.getByRole('button',{name:'This week',exact:true})).toBeDisabled();
  await page.goto('/');await page.getByRole('button',{name:'New task',exact:true}).first().click();await page.locator('#task-title').fill('Dashboard task');await page.locator('#task-priority').focus();await page.keyboard.press('Enter');await page.keyboard.press('End');await page.keyboard.press('Enter');await expect(page.locator('#task-priority')).toContainText('High');
  await page.locator('#task-deadline').click();await page.locator('[data-day="2026-11-03"]').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await dialog(page).getByRole('button',{name:'Create task',exact:true}).click();
  await page.getByRole('link',{name:'Open planner',exact:true}).click();await expect(page.getByRole('button',{name:'Edit: Dashboard task',exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Dashboard task.*09:00/}).click();await expect(page.locator('#task-title')).toHaveValue('Dashboard task');await page.locator('#task-description').fill('Real task description');await dialog(page).getByRole('button',{name:'Save task',exact:true}).click();expect((await stored(page)).tasks[0].description).toBe('Real task description');
  await page.goto('/habits');await page.getByRole('button',{name:'Add entry',exact:true}).click();await page.locator('#usage-app').fill('Social');await page.locator('#usage-minutes').fill('420');await select(page,'#usage-category','Entertainment');await dialog(page).getByRole('button',{name:'Add entry',exact:true}).click();await page.locator('#habit-reduction').fill('420');await page.getByRole('button',{name:'Save focus capacity',exact:true}).click();expect((await stored(page)).preferences.focusBonusPerDayMinutes).toBe(60);
  await page.reload();expect((await stored(page)).preferences.focusBonusPerDayMinutes).toBe(60);await page.getByRole('switch').click();await page.getByRole('button',{name:'Save focus capacity',exact:true}).click();expect((await stored(page)).preferences.focusBonusPerDayMinutes).toBe(0);
  await page.getByRole('link',{name:'Test it in the Simulation Lab',exact:true}).click();await expect(page).toHaveURL(/simulation/);
  await page.goto('/insights');const links=await page.locator('main a').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent!,href:n.getAttribute('href')!})));expect(links.length).toBeGreaterThanOrEqual(4);
  for(const link of links){await page.goto('/insights');await page.locator('main a').filter({hasText:link.text.trim()}).first().click();await expect(page).toHaveURL(new RegExp(link.href+'$'));}
});

test('onboarding back/validation/appearance/language and malformed recovery stay usable',async({page})=>{
  await boot(page,false);await page.getByRole('button',{name:'Continue',exact:true}).click();await page.locator('#onboarding-study-start').fill('');await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await page.locator('#onboarding-study-start').fill('09:00');
  await page.getByRole('button',{name:'Back',exact:true}).click();await expect(page.locator('#onboarding-name')).toBeVisible();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await select(page,'#onboarding-language','Français');await select(page,'#onboarding-language','English');await page.getByRole('radio',{name:'Dark',exact:true}).click();await expect(page.locator('html')).toHaveClass(/dark/);await page.getByRole('radio',{name:'System',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await page.locator('#onboarding-course-name').fill('Course');await page.getByRole('radio',{name:'Violet',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Start planning',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await page.locator('#onboarding-task-title').fill('First task');await page.getByRole('button',{name:'Start planning',exact:true}).click();await expect(dialog(page)).toHaveCount(0);
  await page.evaluate(()=>localStorage.setItem('sentinel.v2.data','{invalid'));await page.goto('/settings');await page.getByRole('button',{name:'Validate backup',exact:true}).click();await expect(page.getByText(/cannot be restored as SENTINEL JSON/)).toBeVisible();await expect(page.getByRole('button',{name:'Restore valid records',exact:true})).toBeDisabled();expect(await page.evaluate(()=>localStorage.getItem('sentinel.v2.data.corrupt'))).toBe('{invalid');
});
