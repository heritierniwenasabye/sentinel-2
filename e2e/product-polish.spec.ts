import { test, expect } from './fixtures';
for (const [day,width] of [[2,1440],[7,375]] as const) test(`repeatable demo shift comparison on November ${day} at ${width}px`, async({page})=>{
  await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.install({time:new Date(`2026-11-${String(day).padStart(2,'0')}T10:00:00-06:00`)});
  await page.goto('/');await page.getByRole('button',{name:'Skip setup',exact:true}).click();await page.goto('/settings');await page.getByRole('button',{name:'Load demo data',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Load demo data',exact:true}).click();
  await page.goto('/planner');
  await page.getByRole('button',{name:'New task',exact:true}).first().click();await page.locator('#task-title').fill('Unsaved draft');await page.locator('#task-deadline').click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(1);await expect(page.locator('#task-title')).toHaveValue('Unsaved draft');
  await page.locator('#task-priority').click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(1);await expect(page.getByRole('listbox')).toHaveCount(0);await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  const block=page.locator('main button[title]').first();await expect(block).toBeVisible();
  const info=await block.evaluate(el=>({title:el.getAttribute('title')!,column:Array.from(el.parentElement!.parentElement!.children).indexOf(el.parentElement!)}));
  const times=info.title.match(/(\d{2}:\d{2})–(\d{2}:\d{2})$/)!;expect(times).toBeTruthy();const date=`2026-11-${String(info.column+1).padStart(2,'0')}`;
  await page.goto('/simulation');await expect(page.getByText(/Comparing this week:/)).toBeVisible();
  const current=await page.locator('dl').first().innerText();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sentinel.v2.data')!).data);
  await page.locator('#shift-title').fill('Extra campus shift');await page.locator('#shift-date').fill(date);await page.locator('#shift-start').fill(times[1]);await page.locator('#shift-end').fill(times[2]);
  if(width===375){const dateBox=await page.locator('#shift-date').boundingBox();const timeBox=await page.locator('#shift-start').boundingBox();expect(dateBox!.width).toBeGreaterThan(timeBox!.width*1.5);}
  await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
  await expect(page.getByText(/Fixed commitments take \d+ more minutes this week/)).toBeVisible();expect(await page.locator('dl').first().innerText()).toBe(current);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('sentinel.v2.data')!).data)).toEqual(saved);
  await page.getByRole('button',{name:'Apply scenario',exact:true}).click();await expect(page.getByText(/there is no automatic undo after applying/)).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'Keep simulating',exact:true}).click();
  await page.getByRole('button',{name:'Reset simulation',exact:true}).click();await expect(page.getByText('No changes yet. Add one from the scenario builder.',{exact:true})).toHaveCount(1);
  await page.goto('/habits');const log=page.getByRole('region',{name:'Screen time',exact:true});await expect(log).toBeVisible();expect(await log.evaluate(el=>el.scrollHeight>el.clientHeight && el.clientHeight<=448)).toBe(true);
  await page.clock.runFor(300);
  const ticks=await page.locator('.recharts-yAxis .recharts-cartesian-axis-tick-value').evaluateAll(nodes=>nodes.map(node=>({left:node.getBoundingClientRect().left,edge:node.closest('svg')!.getBoundingClientRect().left})));
  expect(ticks.length).toBeGreaterThan(0);for(const tick of ticks)expect(tick.left).toBeGreaterThanOrEqual(tick.edge);
  await log.hover();await page.mouse.wheel(0,700);await expect.poll(()=>log.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);await expect(page.getByRole('button',{name:'Add usage goal',exact:true})).toBeVisible();
});
