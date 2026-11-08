import { test, expect } from './fixtures';
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
const data=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('sentinel.v2.data')!).data);
async function boot(page:Page){await page.clock.install({time:new Date('2026-11-02T08:00:00-06:00')});await page.goto('/');await page.getByRole('button',{name:'Skip setup',exact:true}).click();}
const routes=['/','/planner','/simulation','/habits','/insights','/settings'];

test('all routes support real navigation, refresh, back and forward without changing data',async({page})=>{
  await boot(page);await page.goto('/settings');await page.getByRole('button',{name:'Load demo data',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Load demo data',exact:true}).click();
  const saved=await data(page);
  for(const route of routes){
    await page.goto(route);await expect(page.locator('main h1')).toBeVisible();await expect(page).toHaveURL(new RegExp(route==='/'?'/$':route+'$'));await page.reload();await expect(page.locator('main h1')).toBeVisible();expect(await data(page)).toEqual(saved);
  }
  await page.setViewportSize({width:1440,height:900});await page.goto('/');await page.locator('aside').getByRole('link',{name:'Smart Planner',exact:true}).click();await expect(page).toHaveURL(/planner$/);await page.locator('aside').getByRole('link',{name:'Digital Habits',exact:true}).click();await expect(page).toHaveURL(/habits$/);
  await page.goBack();await expect(page).toHaveURL(/planner$/);await page.goForward();await expect(page).toHaveURL(/habits$/);expect(await data(page)).toEqual(saved);
});

for(const theme of ['Light','Dark'])test(`screenshots and overflow on all routes and five widths (${theme})`,async({page},info)=>{
  test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});await boot(page);await page.goto('/settings');await page.getByRole('button',{name:'Load demo data',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Load demo data',exact:true}).click();await page.getByRole('radio',{name:new RegExp('^'+theme)}).click();
  for(const width of [320,375,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    for(const route of routes){
      await page.goto(route);await expect(page.locator('main h1')).toBeVisible();await page.clock.runFor(300);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
      const ticks=await page.locator('.recharts-yAxis .recharts-cartesian-axis-tick-value').evaluateAll(nodes=>nodes.map(n=>({box:n.getBoundingClientRect().toJSON(),svg:n.closest('svg')!.getBoundingClientRect().toJSON()})));
      for(const tick of ticks){expect(tick.box.left).toBeGreaterThanOrEqual(tick.svg.left-1);expect(tick.box.right).toBeLessThanOrEqual(tick.svg.right+1);}
      await page.screenshot({path:info.outputPath(`${theme}-${width}-${route.slice(1)||'overview'}.png`),fullPage:true});
    }
  }
});

test('five locales render all routes on mobile without missing keys, placeholders or overflow',async({page})=>{
  test.setTimeout(120000);await boot(page);await page.goto('/settings');await page.getByRole('button',{name:'Load demo data',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Load demo data',exact:true}).click();await page.setViewportSize({width:320,height:900});
  for(const [label,code]of[['English','en'],['Français','fr'],['Español','es'],['Português','pt'],['简体中文','zh-CN']]){
    await page.goto('/settings');await page.getByRole('radio',{name:new RegExp(label)}).click();await expect(page.locator('html')).toHaveAttribute('lang',code);
    for(const route of routes){await page.goto(route);await expect(page.locator('main h1')).toBeVisible();const text=await page.locator('main').innerText();expect(text).not.toMatch(/\{\{|\b(?:planner|simulation|settings|habits|goals)\.[a-zA-Z]+\./);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);}
  }
});

for(const [date,width]of[['2026-11-02',1440],['2026-11-07',375]] as const)test(`demo confirmed shift persists and original is restored from actual export (${date})`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.clock.install({time:new Date(`${date}T10:00:00-06:00`)});await page.goto('/');await page.getByRole('button',{name:'Skip setup',exact:true}).click();await page.goto('/settings');await page.getByRole('button',{name:'Load demo data',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Load demo data',exact:true}).click();
  const original=await data(page);const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'Download',exact:true}).click();const download=await waiting;const bytes=await readFile((await download.path())!);
  await page.goto('/planner');const block=page.locator('main button[title]').first();const info=await block.evaluate(el=>({title:el.getAttribute('title')!,column:Array.from(el.parentElement!.parentElement!.children).indexOf(el.parentElement!)}));const times=info.title.match(/(\d{2}:\d{2})–(\d{2}:\d{2})$/)!;
  await page.goto('/simulation');await page.locator('#shift-title').fill('Verified demo shift');await page.locator('#shift-date').fill(`2026-11-${String(info.column+1).padStart(2,'0')}`);await page.locator('#shift-start').fill(times[1]);await page.locator('#shift-end').fill(times[2]);await page.getByRole('button',{name:'Add to comparison',exact:true}).click();expect(await data(page)).toEqual(original);
  await page.getByRole('button',{name:'Apply scenario',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Apply changes',exact:true}).click();await page.reload();const applied=await data(page);expect(applied.commitments).toHaveLength(original.commitments.length+1);expect(applied.commitments.filter((c:{title:string})=>c.title==='Verified demo shift')).toHaveLength(1);expect(applied.tasks).toEqual(original.tasks);
  await page.goto('/settings');await page.locator('#json-import').setInputFiles({name:'actual-export.json',mimeType:'application/json',buffer:bytes});await page.getByRole('dialog').getByRole('radio',{name:/Replace/}).click();await page.getByRole('dialog').getByRole('button',{name:'Replace everything',exact:true}).click();await page.reload();expect(await data(page)).toEqual(original);
});

test('an independently constrained shift changes study totals; an after-deadline shift does not',async({page})=>{
  await boot(page);await page.goto('/planner');await page.getByRole('button',{name:'New task',exact:true}).first().click();await page.locator('#task-title').fill('Deadline exercise');await page.locator('#task-deadline').click();await page.locator('[data-day="2026-11-02"]').click();await page.locator('#task-deadline-time').fill('09:30');await page.locator('#task-duration').fill('30');await page.getByRole('dialog').getByRole('button',{name:'Create task',exact:true}).click();await expect(page.locator('button[title="Deadline exercise · 09:00–09:30"]')).toBeVisible();
  const saved=await data(page);await page.goto('/simulation');await page.locator('#shift-title').fill('Conflicting shift');await page.locator('#shift-date').fill('2026-11-02');await page.locator('#shift-start').fill('09:00');await page.locator('#shift-end').fill('09:30');await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
  await expect(page.getByText('The simulated plan schedules 30 fewer minutes of study.',{exact:true})).toBeVisible();await expect(page.getByText('30 more minutes of coursework cannot be scheduled.',{exact:true})).toBeVisible();expect(await data(page)).toEqual(saved);
  await page.getByRole('button',{name:'Reset simulation',exact:true}).click();await page.locator('#shift-title').fill('Late shift');await page.locator('#shift-start').fill('22:00');await page.locator('#shift-end').fill('23:00');await page.getByRole('button',{name:'Add to comparison',exact:true}).click();await expect(page.getByText('Fixed commitments take 60 more minutes this week.',{exact:true})).toBeVisible();await expect(page.getByText('Planned study, unscheduled coursework, available capacity and conflict count are unchanged.',{exact:true})).toBeVisible();expect(await data(page)).toEqual(saved);
});
test('usage goal dialog traps keyboard focus and restores its trigger',async({page})=>{
  await boot(page);await page.goto('/habits');const trigger=page.getByRole('button',{name:'Add usage goal',exact:true});await trigger.click();await expect(page.locator('#goal-app')).toBeFocused();
  for(let i=0;i<12;i++){await page.keyboard.press('Tab');expect(await page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement))).toBe(true);}
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(trigger).toBeFocused();expect((await data(page)).usageGoals).toEqual([]);
});
