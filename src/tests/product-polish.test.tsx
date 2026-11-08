import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { parseISO, differenceInMinutes } from 'date-fns';
import { AppProvider } from '@/hooks/use-app';
import { ComparisonTooltip } from '@/components/simulation/comparison-chart';
import { createDemoData } from '@/lib/storage/demo';
import { createEmptyData } from '@/lib/storage/storage';
import { compareScenario } from '@/lib/simulation/engine';
import { buildSchedule } from '@/lib/scheduling/engine';
import type { ScenarioOp } from '@/types';

it('formats an hours-based chart tooltip as the correct duration',()=>{
  render(<AppProvider><ComparisonTooltip active label="Monday" labels={{baseline:'Current'}} payload={[{dataKey:'baseline',value:1.5}]}/></AppProvider>);
  expect(screen.getByText('1 h 30 min')).toBeInTheDocument();
  expect(screen.queryByText('1.5 min')).not.toBeInTheDocument();
});
it('explains fixed work time even when it does not change study allocation',()=>{
  const data=createEmptyData();const now=new Date(2026,10,2,8);
  const result=compareScenario(data,{now,weekStart:now,ops:[{type:'add-commitment',commitment:{id:'shift',title:'Shift',category:'work',notes:'',start:'2026-11-02T22:00:00',end:'2026-11-02T23:00:00'}}]});
  expect(result.explanations).toContainEqual({id:'fixed-time',key:'simulation.explanations.fixedUp',params:{minutes:60},tone:'info'});
  expect(result.explanations.some(e=>e.key==='simulation.explanations.noChange')).toBe(true);
});
it('marks gained spare capacity as positive and lost capacity as a warning',()=>{
  const data=createEmptyData();data.preferences.maxDailyStudyMinutes=960;
  const now=new Date(2026,10,2,8);const shift:ScenarioOp={type:'add-commitment',commitment:{id:'shift',title:'Shift',category:'work',notes:'',start:'2026-11-02T09:00:00',end:'2026-11-02T21:00:00'}};
  expect(compareScenario(data,{now,weekStart:now,ops:[shift]}).explanations.find(e=>e.id==='capacity')?.tone).toBe('warning');
  data.commitments=[shift.commitment];
  expect(compareScenario(data,{now,weekStart:now,ops:[{type:'remove-commitment',commitmentId:'shift'}]}).explanations.find(e=>e.id==='capacity')?.tone).toBe('positive');
});
describe('date-relative demo rehearsal',()=>{
  for(let day=2;day<=8;day++)it(`has an honest calculated work-shift comparison on November ${day}`,()=>{
    const now=new Date(2026,10,day,10);const data=createDemoData(now);
    const baseline=buildSchedule({...data,weekStart:now,now});
    const block=baseline.blocks.find(b=>parseISO(b.start)>=now);expect(block).toBeDefined();
    const result=compareScenario(data,{now,weekStart:now,ops:[{type:'add-commitment',commitment:{id:'demo_extra',title:'Extra shift',category:'work',notes:'',start:block!.start,end:block!.end}}]});
    expect(result.simulated.totals.fixedMinutes-result.baseline.totals.fixedMinutes).toBe(differenceInMinutes(parseISO(block!.end),parseISO(block!.start)));
    expect(result.explanations.some(e=>e.id==='fixed-time')).toBe(true);
    expect(result.simulated.blocks.every(b=>parseISO(b.end)<=parseISO(block!.start)||parseISO(b.start)>=parseISO(block!.end))).toBe(true);
  });
});
