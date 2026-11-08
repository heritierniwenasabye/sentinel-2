import { expect, it } from 'vitest';
import { buildSchedule } from '@/lib/scheduling/engine';
import { DEFAULT_PREFERENCES } from '@/lib/preferences';
import { toLocalIso } from '@/lib/date';
import type { Task } from '@/types';
const task=(id:string,deadline:string,minutes=15):Task=>({id,title:id,deadline,estimatedMinutes:minutes,completedMinutes:0,priority:'high',completed:false,course:'',description:'',createdAt:'2026-11-02T08:00:00'});
it('uses a local 09:00 boundary immediately even in a fractional-offset timezone',()=>{
  const now=new Date(2026,10,2,9);
  const result=buildSchedule({tasks:[task('urgent','2026-11-02T09:15:00')],commitments:[],preferences:DEFAULT_PREFERENCES,weekStart:now,now});
  expect(result.totals.plannedMinutes).toBe(15);
  expect(result.blocks[0].start).toBe(now.toISOString());
  expect(result.totals.unscheduledMinutes).toBe(0);
});
it('counts the exact horizon boundary and preserves later unfinished work outside its totals',()=>{
  const now=new Date(2026,10,2,8);const tasks=[task('edge','2026-11-16T00:00:00'),task('later','2026-11-16T00:01:00')];
  const result=buildSchedule({tasks,commitments:[],preferences:DEFAULT_PREFERENCES,weekStart:now,now});
  expect(result.totals.demandMinutes).toBe(15);expect(result.blocks.map(b=>b.taskId)).toEqual(['edge']);expect(tasks[1].completed).toBe(false);
});
it('uses priority only after deadline and preserves input order/data across repeated recalculation',()=>{
  const now=new Date(2026,10,2,8);const tasks=[{...task('low','2026-11-02T12:00:00',30),priority:'low' as const},task('high','2026-11-02T12:00:00',30),{...task('earlier','2026-11-02T10:00:00',30),priority:'low' as const}];
  const snapshot=JSON.stringify(tasks);const input={tasks,commitments:[],preferences:DEFAULT_PREFERENCES,weekStart:now,now};
  const result=buildSchedule(input);expect(result.blocks.map(b=>b.taskId)).toEqual(['earlier','high','low']);expect(result).toEqual(buildSchedule(input));expect(JSON.stringify(tasks)).toBe(snapshot);
});
it('includes a Sunday overnight recurring shift in Monday protection and exact demand accounting',()=>{
  const now=new Date(2026,10,2,8);const result=buildSchedule({tasks:[task('work','2026-11-02T11:15:00',75)],commitments:[{id:'night',title:'Night shift',category:'work',notes:'',start:'2026-10-25T22:00:00',end:'2026-10-26T10:00:00',recurrence:'weekly',weekdays:[0]}],preferences:DEFAULT_PREFERENCES,weekStart:now,now});
  expect(toLocalIso(new Date(result.blocks[0].start))).toBe('2026-11-02T10:00:00');expect(result.totals.plannedMinutes).toBe(75);expect(result.totals.plannedMinutes+result.totals.unscheduledMinutes).toBe(75);
});
