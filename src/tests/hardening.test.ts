import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseISO, addDays } from 'date-fns';
import { buildSchedule, taskRemainingMinutes } from '@/lib/scheduling/engine';
import { createEmptyData, parseImport, loadAppData, saveAppData, readRecoveryBackup, CORRUPT_BACKUP_KEY, mergeAppData, exportAppData } from '@/lib/storage/storage';
import { STORAGE_KEY, DEFAULT_PREFERENCES } from '@/lib/preferences';
import { parseCsv, parseDateTimeCell, commitmentsFromCsv, commitmentsToCsv } from '@/lib/io/csv';
import { goalProgress } from '@/lib/analytics/goals';
import { isDateKey, expandCommitments } from '@/lib/recurrence';
import { toLocalIso } from '@/lib/date';
import { compareScenario } from '@/lib/simulation/engine';
import { commitScenario } from '@/lib/simulation/scenario';
import type { Task, Commitment, ScenarioOp } from '@/types';

afterEach(() => vi.restoreAllMocks());
const now = new Date(2026,10,2,8);
const task = (id='task', minutes=90): Task => ({id,title:id,course:'',description:'',deadline:'2026-11-03T23:59:00',estimatedMinutes:minutes,completedMinutes:0,completed:false,priority:'high',createdAt:toLocalIso(now)});

describe('data integrity', () => {
  it.each(['2026-02-30','2026-13-01','2026-11-31'])('rejects impossible day %s', value => {
    expect(isDateKey(value)).toBe(false); expect(parseDateTimeCell(value)).toBeNull();
  });
  it('reports invalid IDs, duplicate IDs, invalid durations and broken relationships', () => {
    const result = parseImport(JSON.stringify({tasks:[task(),task(),{...task('bad id')},{...task('huge'),estimatedMinutes:1e20},{...task('link'),courseId:'missing'}]}));
    expect(result.data?.tasks).toHaveLength(2); expect(result.errors).toHaveLength(4); expect(result.data?.tasks[1].courseId).toBe('');
  });
  it('protects partially damaged storage and exposes its original bytes', () => {
    const raw = JSON.stringify({ tasks:[task(),{id:'bad'}] }); localStorage.setItem(STORAGE_KEY,raw);
    expect(loadAppData()?.tasks).toHaveLength(1); expect(readRecoveryBackup()).toBe(raw);
    expect(saveAppData(createEmptyData())).toBe(true); expect(localStorage.getItem(CORRUPT_BACKUP_KEY)).toBe(raw);
  });
  it('does not overwrite damaged data when quota prevents a backup', () => {
    localStorage.setItem(STORAGE_KEY,'broken');
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(() => {throw new DOMException('Full','QuotaExceededError');});
    expect(loadAppData()).toBeNull(); expect(saveAppData(createEmptyData())).toBe(false); expect(localStorage.getItem(STORAGE_KEY)).toBe('broken');
  });
  it('keeps an older recovery backup and refuses to overwrite a second damaged primary', () => {
    localStorage.setItem(CORRUPT_BACKUP_KEY,'older'); localStorage.setItem(STORAGE_KEY,'new damaged');
    expect(loadAppData()).toBeNull(); expect(saveAppData(createEmptyData())).toBe(false);
    expect(localStorage.getItem(CORRUPT_BACKUP_KEY)).toBe('older'); expect(readRecoveryBackup()).toBe('new damaged');
  });
  it('handles denied writes and denied reads without throwing', () => {
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(() => {throw Error('denied');});
    expect(saveAppData(createEmptyData())).toBe(false);
    vi.spyOn(Storage.prototype,'getItem').mockImplementation(() => {throw Error('denied');});
    expect(loadAppData()).toBeNull(); expect(readRecoveryBackup()).toBeNull();
  });
  it('rejects oversized and over-count imports before creating records', () => {
    expect(() => parseCsv('x'.repeat(5*1024*1024+1))).toThrow();
    expect(() => parseCsv('name\n'+'row\n'.repeat(10001))).toThrow();
    expect(parseImport(JSON.stringify({tasks:Array.from({length:10001},()=>task())})).data).toBeNull();
  });
  it.each(['name,name\na,b','title,start\na,b,c','__proto__\na','name\n"broken'])('rejects malformed CSV %s',text => expect(()=>parseCsv(text)).toThrow());
  it('round-trips recurrence exceptions without resurrecting cancelled classes', () => {
    const event: Commitment = {id:'class',title:'Class',category:'class',start:'2026-11-02T09:00:00',end:'2026-11-02T10:00:00',notes:'',recurrence:'weekly',weekdays:[1],exceptions:['2026-11-09']};
    const imported = commitmentsFromCsv(commitmentsToCsv([event])); expect(imported.errors).toEqual([]);
    expect(imported.items[0].exceptions).toEqual(['2026-11-09']);
  });
});
describe('usage goals', () => {
  const goal = {id:'goal',app:'Social',dailyLimitMinutes:60};
  it('distinguishes missing data, exact limit and over-limit usage', () => {
    expect(goalProgress(goal,[],now).recorded).toBe(false);
    const entry = {id:'u',app:' social ',date:'2026-11-02',minutes:60,category:'social' as const,createdAt:toLocalIso(now)};
    expect(goalProgress(goal,[entry],now)).toEqual({recorded:true,minutes:60,remaining:0,over:0});
    expect(goalProgress(goal,[entry,{...entry,id:'u2',minutes:30}],now).over).toBe(30);
    expect(goalProgress(goal,[{...entry,date:'2026-11-01'}],now).recorded).toBe(false);
  });
  it('persists, exports, imports, merges and rejects duplicate/invalid goals', () => {
    const data=createEmptyData(); data.usageGoals=[goal]; expect(saveAppData(data)).toBe(true);
    expect(loadAppData()?.usageGoals).toEqual([goal]); expect(parseImport(exportAppData(data)).data?.usageGoals).toEqual([goal]);
    expect(mergeAppData(data,data).data.usageGoals).toEqual([goal]);
    const result=parseImport(JSON.stringify({...data,usageGoals:[goal,goal,{...goal,id:'other',dailyLimitMinutes:-1}]}));
    expect(result.data?.usageGoals).toHaveLength(1); expect(result.errors).toHaveLength(2);
  });
});
describe('deterministic schedule invariants across generated workloads', () => {
  for(let seed=1;seed<=30;seed++) it(`conserves demand and protects all constraints (seed ${seed})`,()=>{
    let state=seed;const rand=()=>{state=(state*1664525+1013904223)>>>0;return state/2**32;};
    const tasks=Array.from({length:12},(_,i)=>({...task(`t${i}`,15+Math.floor(rand()*30)*15),deadline:toLocalIso(new Date(2026,10,1+Math.floor(rand()*18),8+Math.floor(rand()*14))),completedMinutes:Math.floor(rand()*3)*5,completed:rand()<0.1}));
    const commitments:Commitment[]=Array.from({length:6},(_,i)=>{const start=new Date(2026,10,2+i,9+Math.floor(rand()*5));return {id:`c${i}`,title:'Fixed',notes:'',category:'work',start:toLocalIso(start),end:toLocalIso(new Date(+start+120*60000))};});
    const preferences={...DEFAULT_PREFERENCES,maxDailyStudyMinutes:180,minBreakMinutes:15};
    const input={tasks,commitments,preferences,now,weekStart:now};
    const result=buildSchedule(input);expect(result).toEqual(buildSchedule(input));
    expect(result.totals.plannedMinutes+result.totals.unscheduledMinutes).toBe(result.totals.demandMinutes);
    const occurrences=expandCommitments(commitments,new Date(2026,10,2),new Date(2026,10,9));
    for(let i=0;i<result.blocks.length;i++){
      const b=result.blocks[i], start=parseISO(b.start),end=parseISO(b.end); const source=tasks.find(t=>t.id===b.taskId)!;
      expect(+end).toBeLessThanOrEqual(+parseISO(source.deadline));expect(+start).toBeGreaterThanOrEqual(+now);expect(b.minutes).toBeLessThanOrEqual(90);
      expect(start.getHours()).toBeGreaterThanOrEqual(9);expect(end.getHours()).toBeLessThanOrEqual(21);
      for(const c of occurrences) expect(+end<=+parseISO(c.start)||+start>=+parseISO(c.end)).toBe(true);
      if(i)expect(+start-+parseISO(result.blocks[i-1].end)).toBeGreaterThanOrEqual(15*60000);
    }
    for(const t of tasks) expect(result.blocks.filter(b=>b.taskId===t.id).reduce((sum,b)=>sum+b.minutes,0)).toBeLessThanOrEqual(taskRemainingMinutes(t));
    for(const d of result.days)expect(d.studyMinutes).toBeLessThanOrEqual(180);
    const eligible=tasks.filter(t=>!t.completed&&+parseISO(t.deadline)<=+new Date(2026,10,16));
    expect(result.totals.demandMinutes).toBe(eligible.reduce((sum,t)=>sum+taskRemainingMinutes(t),0));
  });
  it('handles minutes-away, overdue, empty, completed and deleted tasks',()=>{
    const input={tasks:[],commitments:[],preferences:DEFAULT_PREFERENCES,weekStart:now,now};
    expect(buildSchedule(input).totals.demandMinutes).toBe(0);
    const short={...task('short',15),deadline:'2026-11-02T09:15:00'};
    expect(buildSchedule({...input,tasks:[short]}).totals.plannedMinutes).toBe(15);
    expect(buildSchedule({...input,tasks:[{...short,deadline:'2026-11-02T08:05:00'}]}).totals.unscheduledMinutes).toBe(15);
    expect(buildSchedule({...input,tasks:[{...short,completed:true}]}).blocks).toEqual([]);
    expect(buildSchedule({...input,tasks:[],now:addDays(now,1)}).blocks).toEqual([]);
  });
});
it('combined simulations remain isolated and confirmed commit matches hypothetical scheduling',()=>{
  const data=createEmptyData();data.tasks=[task()];data.preferences.onboardingCompleted=true;
  data.commitments=[{id:'old',title:'Old',category:'work',notes:'',start:'2026-11-02T09:00:00',end:'2026-11-02T10:00:00'}];
  data.usage=[{id:'u',app:'Social',date:'2026-11-02',minutes:420,category:'social',createdAt:toLocalIso(now)}];
  const original=JSON.stringify(data);
  const ops:ScenarioOp[]=[{type:'remove-commitment',commitmentId:'old'},{type:'add-commitment',commitment:{id:'new',title:'New',category:'work',notes:'',start:'2026-11-02T10:00:00',end:'2026-11-02T12:00:00'}},{type:'update-task',taskId:'task',patch:{deadline:'2026-11-04T23:59:00',estimatedMinutes:150}},{type:'study-window',start:'10:00',end:'18:00'},{type:'screen-time',weeklyReductionMinutes:420,allocateToSchedule:true}];
  const comparison=compareScenario(data,{ops,weekStart:now,now}); expect(JSON.stringify(data)).toBe(original);
  const applied=commitScenario(data,ops,now,now);expect(JSON.stringify(data)).toBe(original);
  expect(buildSchedule({...applied,weekStart:now,now}).totals).toEqual(comparison.simulated.totals);
  expect(compareScenario(data,{ops:[],weekStart:now,now}).simulated).toEqual(comparison.baseline);
});
it('multiple reductions cannot double-count usage and the last allocation choice wins',()=>{
  const data=createEmptyData();data.usage=[{id:'u',app:'Social',date:'2026-11-02',minutes:420,category:'social',createdAt:toLocalIso(now)}];
  data.preferences.focusBonusPerDayMinutes=30;
  const ops:ScenarioOp[]=[{type:'screen-time',weeklyReductionMinutes:420,allocateToSchedule:true},{type:'screen-time',weeklyReductionMinutes:420,allocateToSchedule:false}];
  const comparison=compareScenario(data,{ops,weekStart:now,now});expect(comparison.deltas.recoveredMinutes).toBe(420);
  expect(commitScenario(data,ops,now,now).preferences.focusBonusPerDayMinutes).toBe(30);
});
it('reducing an estimate below completed progress survives export and reload coherently',()=>{
  const data=createEmptyData();data.tasks=[{...task(),completedMinutes:60}];
  const committed=commitScenario(data,[{type:'update-task',taskId:'task',patch:{estimatedMinutes:30}}],now,now);
  const parsed=parseImport(exportAppData(committed));expect(parsed.errors).toEqual([]);expect(parsed.data?.tasks[0].completedMinutes).toBe(30);
});
