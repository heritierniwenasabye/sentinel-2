import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  AppData,
  Commitment,
  Course,
  DigitalUsageEntry,
  Task,
  UserPreferences,
} from '@/types';
import { createEmptyData, exportAppData, loadAppData, saveAppData } from '@/lib/storage/storage';
import { createDemoData } from '@/lib/storage/demo';
import { DEFAULT_PREFERENCES } from '@/lib/preferences';
import i18n from '@/lib/i18n';

export type CourseDeleteMode = 'unlink' | 'delete-tasks';

interface AppContextValue {
  data: AppData;
  courses: Course[];
  tasks: Task[];
  commitments: Commitment[];
  usage: DigitalUsageEntry[];
  preferences: UserPreferences;
  storageAvailable: boolean;
  isDark: boolean;
  demoLoaded: boolean;
  addCourse: (course: Course) => void;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  setCourseArchived: (id: string, archived: boolean) => void;
  deleteCourse: (id: string, mode: CourseDeleteMode) => void;
  deleteCourseTasks: (id: string) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  addCommitment: (commitment: Commitment) => void;
  updateCommitment: (id: string, patch: Partial<Commitment>) => void;
  deleteCommitment: (id: string) => void;
  addUsage: (entry: DigitalUsageEntry) => void;
  updateUsage: (id: string, patch: Partial<DigitalUsageEntry>) => void;
  deleteUsage: (id: string) => void;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  replaceData: (next: AppData) => void;
  loadDemo: () => void;
  clearAll: () => void;
  buildExport: () => string;
}

const AppContext = createContext<AppContextValue | null>(null);

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadAppData() ?? createEmptyData());
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark());

  // Persist every data change through the typed storage layer.
  useEffect(() => {
    const saved = saveAppData(data);
    setStorageAvailable(saved);
  }, [data]);

  // Follow the operating system when appearance is set to "System".
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(query.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  const isDark =
    data.preferences.theme === 'dark' || (data.preferences.theme === 'system' && systemDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  useEffect(() => {
    const language = data.preferences.language;
    if (i18n.language !== language) void i18n.changeLanguage(language);
    document.documentElement.lang = language;
  }, [data.preferences.language]);

  const addCourse = useCallback((course: Course) => {
    setData((current) => ({ ...current, courses: [...current.courses, course] }));
  }, []);

  const updateCourse = useCallback((id: string, patch: Partial<Course>) => {
    setData((current) => ({
      ...current,
      courses: current.courses.map((course) =>
        course.id === id ? { ...course, ...patch } : course,
      ),
      tasks:
        patch.name !== undefined
          ? current.tasks.map((task) =>
              task.courseId === id ? { ...task, course: patch.name as string } : task,
            )
          : current.tasks,
    }));
  }, []);

  const setCourseArchived = useCallback((id: string, archived: boolean) => {
    setData((current) => ({
      ...current,
      courses: current.courses.map((course) =>
        course.id === id ? { ...course, archived } : course,
      ),
    }));
  }, []);

  const deleteCourseTasks = useCallback((id: string) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.courseId !== id),
    }));
  }, []);

  const deleteCourse = useCallback((id: string, mode: CourseDeleteMode) => {
    setData((current) => ({
      ...current,
      courses: current.courses.filter((course) => course.id !== id),
      tasks:
        mode === 'delete-tasks'
          ? current.tasks.filter((task) => task.courseId !== id)
          : current.tasks.map((task) =>
              task.courseId === id ? { ...task, courseId: '', course: '' } : task,
            ),
    }));
  }, []);

  const addTask = useCallback((task: Task) => {
    setData((current) => ({ ...current, tasks: [...current.tasks, task] }));
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setData((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    }));
  }, []);

  const addCommitment = useCallback((commitment: Commitment) => {
    setData((current) => ({ ...current, commitments: [...current.commitments, commitment] }));
  }, []);

  const updateCommitment = useCallback((id: string, patch: Partial<Commitment>) => {
    setData((current) => ({
      ...current,
      commitments: current.commitments.map((commitment) =>
        commitment.id === id ? { ...commitment, ...patch } : commitment,
      ),
    }));
  }, []);

  const deleteCommitment = useCallback((id: string) => {
    setData((current) => ({
      ...current,
      commitments: current.commitments.filter((commitment) => commitment.id !== id),
    }));
  }, []);

  const addUsage = useCallback((entry: DigitalUsageEntry) => {
    setData((current) => ({ ...current, usage: [...current.usage, entry] }));
  }, []);

  const updateUsage = useCallback((id: string, patch: Partial<DigitalUsageEntry>) => {
    setData((current) => ({
      ...current,
      usage: current.usage.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    }));
  }, []);

  const deleteUsage = useCallback((id: string) => {
    setData((current) => ({ ...current, usage: current.usage.filter((entry) => entry.id !== id) }));
  }, []);

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setData((current) => ({
      ...current,
      preferences: { ...current.preferences, ...patch },
    }));
  }, []);

  const replaceData = useCallback((next: AppData) => {
    setData(next);
  }, []);

  const loadDemo = useCallback(() => {
    setData((current) => {
      const demo = createDemoData();
      return {
        ...demo,
        preferences: {
          ...demo.preferences,
          theme: current.preferences.theme,
          language: current.preferences.language,
        },
      };
    });
  }, []);

  const clearAll = useCallback(() => {
    setData((current) => ({
      ...createEmptyData(),
      preferences: {
        ...DEFAULT_PREFERENCES,
        theme: current.preferences.theme,
        language: current.preferences.language,
        onboardingCompleted: current.preferences.onboardingCompleted,
      },
    }));
  }, []);

  const buildExport = useCallback(() => exportAppData(data), [data]);

  const value = useMemo<AppContextValue>(
    () => ({
      data,
      courses: data.courses,
      tasks: data.tasks,
      commitments: data.commitments,
      usage: data.usage,
      preferences: data.preferences,
      storageAvailable,
      isDark,
      demoLoaded: data.demoLoaded,
      addCourse,
      updateCourse,
      setCourseArchived,
      deleteCourse,
      deleteCourseTasks,
      addTask,
      updateTask,
      deleteTask,
      toggleTask,
      addCommitment,
      updateCommitment,
      deleteCommitment,
      addUsage,
      updateUsage,
      deleteUsage,
      updatePreferences,
      replaceData,
      loadDemo,
      clearAll,
      buildExport,
    }),
    [
      data,
      storageAvailable,
      isDark,
      addCourse,
      updateCourse,
      setCourseArchived,
      deleteCourse,
      deleteCourseTasks,
      addTask,
      updateTask,
      deleteTask,
      toggleTask,
      addCommitment,
      updateCommitment,
      deleteCommitment,
      addUsage,
      updateUsage,
      deleteUsage,
      updatePreferences,
      replaceData,
      loadDemo,
      clearAll,
      buildExport,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
