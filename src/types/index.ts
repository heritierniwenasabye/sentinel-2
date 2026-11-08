/**
 * SENTINEL 2.0 — Shared domain models.
 *
 * All datetimes are stored as ISO-8601 strings (local time, no timezone suffix)
 * so that a calendar day is unambiguous for the student. Screen-time entries use
 * a plain `yyyy-MM-dd` date key because they describe a day, not an instant.
 */

export type Priorities = 'low' | 'medium' | 'high';
export type Priority = Priorities;

/** Restrained palette for course colour coding (maps to the chart tokens). */
export type CourseColor = 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'slate';

export type CommitmentRecurrence = 'none' | 'weekly';

export type CommitmentCategory = 'class' | 'work' | 'appointment' | 'personal' | 'rest';

export type UsageCategory = 'social' | 'entertainment' | 'education' | 'productivity' | 'other';

export type Theme = 'light' | 'dark' | 'system';

export type Language = 'en' | 'fr' | 'es' | 'pt' | 'zh-CN';

export interface Course {
  id: string;
  name: string;
  /** Optional catalogue code such as "COMP 101". */
  code: string;
  color: CourseColor;
  instructor: string;
  /** Optional yyyy-MM-dd semester bounds, or an empty string. */
  semesterStart: string;
  semesterEnd: string;
  archived: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  /** Display snapshot of the course name (kept when a course is deleted). */
  course: string;
  /** Stable reference to a course, preferred over the name snapshot. */
  courseId?: string;
  description: string;
  /** ISO datetime by which the work must be finished. */
  deadline: string;
  /** Total study minutes the work needs. */
  estimatedMinutes: number;
  /** Study minutes already completed, subtracted from the remaining demand. */
  completedMinutes?: number;
  priority: Priority;
  completed: boolean;
  createdAt: string;
}

export interface Commitment {
  id: string;
  title: string;
  category: CommitmentCategory;
  /** ISO datetime. */
  start: string;
  /** ISO datetime; always after `start`. */
  end: string;
  notes: string;
  /** 'none' is a single event; 'weekly' repeats on `weekdays`. */
  recurrence?: CommitmentRecurrence;
  /** 0 = Sunday … 6 = Saturday. Used by weekly recurrence. */
  weekdays?: number[];
  /** Inclusive yyyy-MM-dd end of the series, or an empty string for no end. */
  recurrenceUntil?: string;
  /** yyyy-MM-dd occurrence dates removed from a series. */
  exceptions?: string[];
  /** Set on an occurrence that was detached from a recurring series. */
  seriesId?: string;
}

/** A commitment expanded onto one concrete calendar day. */
export interface CommitmentOccurrence extends Commitment {
  /** Series id plus its date key, unique inside a rendered week. */
  occurrenceId: string;
  /** yyyy-MM-dd of this occurrence. */
  dateKey: string;
  isRecurring: boolean;
}

export interface StudyBlock {
  id: string;
  taskId: string;
  taskTitle: string;
  course: string;
  priority: Priority;
  /** ISO datetime. */
  start: string;
  end: string;
  minutes: number;
}

export interface DigitalUsageEntry {
  id: string;
  app: string;
  /** yyyy-MM-dd */
  date: string;
  minutes: number;
  category: UsageCategory;
  createdAt: string;
}

export interface UserPreferences {
  theme: Theme;
  language: Language;
  displayName: string;
  /** HH:mm — earliest time study blocks may be placed. */
  studyStart: string;
  /** HH:mm — latest time study blocks may end. */
  studyEnd: string;
  /** Hard ceiling on planned study minutes for a single day. */
  maxDailyStudyMinutes: number;
  /** Minimum rest between two continuous study blocks. */
  minBreakMinutes: number;
  /** HH:mm — sleep window start. */
  sleepStart: string;
  /** HH:mm — sleep window end. */
  sleepEnd: string;
  /**
   * Extra study capacity per day, in minutes. Used when the student explicitly
   * reallocates time recovered from discretionary screen use.
   */
  focusBonusPerDayMinutes: number;
  /** False until the first-run setup is finished or skipped. */
  onboardingCompleted: boolean;
}

export interface AppData {
  version: 3;
  courses: Course[];
  tasks: Task[];
  commitments: Commitment[];
  usage: DigitalUsageEntry[];
  preferences: UserPreferences;
  demoLoaded: boolean;
}

/* ------------------------------------------------------------------ */
/* Scheduling results                                                  */
/* ------------------------------------------------------------------ */

export interface DayLoad {
  /** yyyy-MM-dd */
  date: string;
  /** Minutes of fixed commitments inside this day. */
  fixedMinutes: number;
  /** Minutes of generated study blocks inside this day. */
  studyMinutes: number;
  /** Free minutes inside the preferred study window (commitments removed). */
  freeMinutes: number;
  /** Usable study capacity after the daily maximum is applied. */
  capacityMinutes: number;
}

export type UnscheduledReason = 'overdue' | 'insufficient-time';

export interface UnscheduledItem {
  taskId: string;
  title: string;
  course: string;
  priority: Priority;
  deadline: string;
  minutesRemaining: number;
  reason: UnscheduledReason;
}

export type ConflictType = 'commitment-overlap' | 'overdue-task';

export interface ScheduleConflict {
  id: string;
  type: ConflictType;
  severity: 'warning' | 'critical';
  /** Titles of the entries involved (user content, never translated). */
  titles: string[];
  /** yyyy-MM-dd of the conflict, when it belongs to a day. */
  date?: string;
  /** Overlap length in minutes for commitment clashes. */
  minutes?: number;
}

export interface ScheduleTotals {
  plannedMinutes: number;
  fixedMinutes: number;
  freeMinutes: number;
  capacityMinutes: number;
  remainingCapacityMinutes: number;
  demandMinutes: number;
  unscheduledMinutes: number;
  scheduledTaskCount: number;
}

export interface ScheduleResult {
  /** ISO datetime of Monday 00:00. */
  weekStart: string;
  weekEnd: string;
  blocks: StudyBlock[];
  days: DayLoad[];
  unscheduled: UnscheduledItem[];
  conflicts: ScheduleConflict[];
  totals: ScheduleTotals;
  /** True when some coursework could not be placed inside the week. */
  infeasible: boolean;
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Simulation                                                          */
/* ------------------------------------------------------------------ */

export interface ScenarioCommitmentOp {
  type: 'add-commitment';
  commitment: Commitment;
}

export interface ScenarioRemoveCommitmentOp {
  type: 'remove-commitment';
  commitmentId: string;
}

export interface ScenarioTaskOp {
  type: 'update-task';
  taskId: string;
  patch: Partial<Pick<Task, 'deadline' | 'estimatedMinutes'>>;
}

export interface ScenarioStudyWindowOp {
  type: 'study-window';
  start: string;
  end: string;
}

export interface ScenarioScreenTimeOp {
  type: 'screen-time';
  weeklyReductionMinutes: number;
  allocateToSchedule: boolean;
}

export type ScenarioOp =
  | ScenarioCommitmentOp
  | ScenarioRemoveCommitmentOp
  | ScenarioTaskOp
  | ScenarioStudyWindowOp
  | ScenarioScreenTimeOp;

export interface SimulationScenario {
  id: string;
  createdAt: string;
  ops: ScenarioOp[];
}

export type ExplanationTone = 'info' | 'positive' | 'warning' | 'critical';

/** A translatable statement produced by comparing two computed schedules. */
export interface Explanation {
  id: string;
  key: string;
  params?: Record<string, string | number>;
  tone: ExplanationTone;
}

export interface SimulationComparison {
  baseline: ScheduleResult;
  simulated: ScheduleResult;
  deltas: {
    plannedMinutes: number;
    unscheduledMinutes: number;
    conflictCount: number;
    remainingCapacityMinutes: number;
    demandMinutes: number;
    recoveredMinutes: number;
  };
  explanations: Explanation[];
  requiredReviews: string[];
}

/* ------------------------------------------------------------------ */
/* Insights                                                            */
/* ------------------------------------------------------------------ */

export type InsightTone = 'positive' | 'info' | 'warning' | 'critical';

export interface Insight {
  id: string;
  key: string;
  params?: Record<string, string | number>;
  tone: InsightTone;
}

export type PressureBand = 'balanced' | 'elevated' | 'high';

export interface PressureComponent {
  key: string;
  /** Normalised 0..1 contribution. */
  ratio: number;
  weight: number;
  points: number;
  /** Raw measurement behind the ratio, for disclosure in the UI. */
  value: number;
  unit: 'ratio' | 'minutes' | 'count';
}

export interface WorkloadAnalysis {
  score: number;
  band: PressureBand;
  components: PressureComponent[];
  longestConsecutiveMinutes: number;
  breakOpportunities: number;
  daysWithoutBreak: number;
  studyDays: number;
  overloadedDays: DayLoad[];
  totalStudyMinutes: number;
  totalFixedMinutes: number;
  unscheduledMinutes: number;
  unscheduledCount: number;
  conflictCount: number;
  insights: Insight[];
}
