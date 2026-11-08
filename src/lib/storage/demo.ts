import { addDays } from 'date-fns';
import type {
  AppData,
  Commitment,
  CommitmentCategory,
  Course,
  DigitalUsageEntry,
  Task,
  UsageCategory,
} from '@/types';
import { DEFAULT_PREFERENCES } from '@/lib/preferences';
import { toLocalIso, toDateKey, combineDayAndTime, startOfWeekMonday } from '@/lib/date';

/**
 * Deterministic demonstration dataset for the fictional student Alex Morgan.
 * Every date is relative to "now", so the demo always looks current. It is only
 * ever installed through the explicit "Load demo data" action.
 */
export function createDemoData(now: Date = new Date()): AppData {
  const weekStart = startOfWeekMonday(now);

  const at = (dayOffset: number, time: string): string =>
    toLocalIso(combineDayAndTime(addDays(weekStart, dayOffset), time));

  const dueIn = (days: number): string =>
    toLocalIso(combineDayAndTime(addDays(now, days), '23:59'));

  const createdAt = toLocalIso(addDays(now, -10));
  const clientCreatedAt = toLocalIso(now);

  const semesterStart = toDateKey(addDays(now, -30));
  const semesterEnd = toDateKey(addDays(now, 70));

  const courses: Course[] = [
    {
      id: 'course_demo_prog',
      name: 'Introduction to Programming',
      code: 'COMP 101',
      color: 'blue',
      instructor: 'Dr. A. Whitfield',
      semesterStart,
      semesterEnd,
      archived: false,
      createdAt: clientCreatedAt,
    },
    {
      id: 'course_demo_math',
      name: 'Applied Mathematics',
      code: 'MATH 117',
      color: 'green',
      instructor: 'Prof. L. Moreau',
      semesterStart,
      semesterEnd,
      archived: false,
      createdAt: clientCreatedAt,
    },
    {
      id: 'course_demo_writing',
      name: 'College Writing',
      code: 'COMP 120',
      color: 'amber',
      instructor: 'Dr. S. Okafor',
      semesterStart,
      semesterEnd,
      archived: false,
      createdAt: clientCreatedAt,
    },
    {
      id: 'course_demo_it',
      name: 'Information Technology',
      code: 'ITEC 210',
      color: 'violet',
      instructor: 'Mx. R. Ibarra',
      semesterStart,
      semesterEnd,
      archived: false,
      createdAt: clientCreatedAt,
    },
  ];

  const tasks: Task[] = [
    {
      id: 'task_demo_ps4',
      title: 'Problem Set 4 — Recursion',
      course: 'Introduction to Programming',
      courseId: 'course_demo_prog',
      description: 'Implement the four recursive functions and document the complexity of each solution.',
      deadline: dueIn(1),
      estimatedMinutes: 180,
      completedMinutes: 0,
      priority: 'high',
      completed: false,
      createdAt,
    },
    {
      id: 'task_demo_integrals',
      title: 'Integral Practice Set',
      course: 'Applied Mathematics',
      courseId: 'course_demo_math',
      description: 'Chapter 7 exercises 12–30, including the substitution problems.',
      deadline: dueIn(2),
      estimatedMinutes: 150,
      completedMinutes: 30,
      priority: 'high',
      completed: false,
      createdAt,
    },
    {
      id: 'task_demo_essay',
      title: 'Argumentative Essay Draft',
      course: 'College Writing',
      courseId: 'course_demo_writing',
      description: '1,200-word draft with three cited sources and a counter-argument section.',
      deadline: dueIn(3),
      estimatedMinutes: 240,
      completedMinutes: 0,
      priority: 'high',
      completed: false,
      createdAt,
    },
    {
      id: 'task_demo_db',
      title: 'Database Normalization Exercise',
      course: 'Information Technology',
      courseId: 'course_demo_it',
      description: 'Normalise the supplied schema to third normal form and justify each step.',
      deadline: dueIn(4),
      estimatedMinutes: 120,
      completedMinutes: 0,
      priority: 'medium',
      completed: false,
      createdAt,
    },
    {
      id: 'task_demo_lab',
      title: 'Lab Report — Linked Lists',
      course: 'Introduction to Programming',
      courseId: 'course_demo_prog',
      description: 'Write up the implementation notes and the two benchmark tables.',
      deadline: dueIn(5),
      estimatedMinutes: 90,
      completedMinutes: 0,
      priority: 'medium',
      completed: false,
      createdAt,
    },
    {
      id: 'task_demo_security',
      title: 'Security Case Study',
      course: 'Information Technology',
      courseId: 'course_demo_it',
      description: 'Two-page analysis of the case study incident timeline.',
      deadline: dueIn(5),
      estimatedMinutes: 90,
      completedMinutes: 0,
      priority: 'low',
      completed: false,
      createdAt,
    },
    {
      id: 'task_demo_quiz',
      title: 'Quiz Preparation — Series',
      course: 'Applied Mathematics',
      courseId: 'course_demo_math',
      description: 'Review convergence tests and redo the two practice quizzes.',
      deadline: dueIn(6),
      estimatedMinutes: 90,
      completedMinutes: 0,
      priority: 'medium',
      completed: false,
      createdAt,
    },
    {
      id: 'task_demo_peer',
      title: 'Peer Review Responses',
      course: 'College Writing',
      courseId: 'course_demo_writing',
      description: 'Respond to two classmates with specific, constructive notes.',
      deadline: dueIn(6),
      estimatedMinutes: 60,
      completedMinutes: 0,
      priority: 'low',
      completed: false,
      createdAt,
    },
    {
      id: 'task_demo_reading',
      title: 'Reading Response 3',
      course: 'College Writing',
      courseId: 'course_demo_writing',
      description: 'Short response on the assigned chapter.',
      deadline: toLocalIso(addDays(now, -2)),
      estimatedMinutes: 45,
      completedMinutes: 45,
      priority: 'low',
      completed: true,
      createdAt,
    },
  ];

  const commitment = (
    id: string,
    title: string,
    category: CommitmentCategory,
    dayOffset: number,
    start: string,
    end: string,
    notes = '',
    repeatWeekly = false,
  ): Commitment => {
    const day = addDays(weekStart, dayOffset);
    return {
      id,
      title,
      category,
      start: at(dayOffset, start),
      end: at(dayOffset, end),
      notes,
      recurrence: repeatWeekly ? 'weekly' : 'none',
      weekdays: repeatWeekly ? [day.getDay()] : [],
      recurrenceUntil: repeatWeekly ? toDateKey(addDays(now, 56)) : '',
      exceptions: [],
    };
  };

  const commitments: Commitment[] = [
    commitment('c_demo_mon_lecture', 'Introduction to Programming — Lecture', 'class', 0, '09:00', '10:30', '', true),
    commitment('c_demo_mon_tutorial', 'Applied Mathematics — Tutorial', 'class', 0, '11:00', '12:30', '', true),
    commitment('c_demo_advisor', 'Academic advisor meeting', 'appointment', 0, '15:00', '16:00'),
    commitment('c_demo_tue_seminar', 'College Writing — Seminar', 'class', 1, '10:00', '11:30', '', true),
    commitment('c_demo_tue_shift', 'Campus café shift', 'work', 1, '17:00', '21:00', 'Covering for a colleague.', true),
    commitment('c_demo_wed_lab', 'Introduction to Programming — Lab', 'class', 2, '09:00', '10:30', '', true),
    commitment('c_demo_wed_it', 'Information Technology — Lecture', 'class', 2, '14:00', '15:30', '', true),
    commitment('c_demo_wed_gym', 'Gym session', 'personal', 2, '19:00', '20:30', '', true),
    commitment('c_demo_thu_math', 'Applied Mathematics — Lecture', 'class', 3, '11:00', '12:30', '', true),
    commitment('c_demo_thu_group', 'Study group — database exercise', 'personal', 3, '16:00', '17:30', '', true),
    commitment('c_demo_fri_writing', 'College Writing — Workshop', 'class', 4, '10:00', '11:30', '', true),
    commitment('c_demo_fri_it', 'Information Technology — Lab', 'class', 4, '13:00', '14:30', '', true),
    commitment('c_demo_fri_shift', 'Campus café shift', 'work', 4, '17:00', '21:00', '', true),
    commitment('c_demo_fri_rest', 'Wind-down, no screens', 'rest', 4, '21:30', '22:00'),
    commitment('c_demo_sat_shift', 'Campus café shift', 'work', 5, '10:00', '16:00', '', true),
    commitment('c_demo_sun_lunch', 'Family lunch', 'personal', 6, '12:00', '14:00'),
    commitment('c_demo_sun_reset', 'Weekly reset and planning', 'rest', 6, '18:00', '18:30'),
  ];

  const appSpecs: { app: string; category: UsageCategory; base: number }[] = [
    { app: 'Instagram', category: 'social', base: 74 },
    { app: 'TikTok', category: 'social', base: 61 },
    { app: 'YouTube', category: 'entertainment', base: 88 },
    { app: 'Snapchat', category: 'social', base: 34 },
    { app: 'Notion', category: 'productivity', base: 26 },
    { app: 'Coursera', category: 'education', base: 41 },
  ];

  const usage: DigitalUsageEntry[] = [];
  for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
    const day = addDays(now, -dayOffset);
    const dateKey = toDateKey(day);
    appSpecs.forEach((spec, appIndex) => {
      const variance = (dayOffset * 13 + appIndex * 7) % 29;
      const minutes = spec.base + variance;
      usage.push({
        id: `u_demo_${dateKey}_${appIndex}`,
        app: spec.app,
        date: dateKey,
        minutes,
        category: spec.category,
        createdAt: toLocalIso(day),
      });
    });
  }

  return {
    version: 3,
    courses,
    tasks,
    commitments,
    usage,
    usageGoals: [],
    preferences: {
      ...DEFAULT_PREFERENCES,
      displayName: 'Alex Morgan',
      studyStart: '09:00',
      studyEnd: '21:30',
      maxDailyStudyMinutes: 210,
      minBreakMinutes: 15,
      sleepStart: '23:30',
      sleepEnd: '07:00',
      focusBonusPerDayMinutes: 0,
      onboardingCompleted: true,
    },
    demoLoaded: true,
  };
}
