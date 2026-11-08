import { lazy, Suspense, type ReactNode, Component } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from '@/hooks/use-app';
import { ToastProvider } from '@/components/ui/toast';
import { AppShell } from '@/components/layout/app-shell';
const OverviewPage = lazy(() => import('@/pages/overview').then(module => ({ default: module.OverviewPage })));
const PlannerPage = lazy(() => import('@/pages/planner').then(module => ({ default: module.PlannerPage })));
const SimulationPage = lazy(() => import('@/pages/simulation').then(module => ({ default: module.SimulationPage })));
const HabitsPage = lazy(() => import('@/pages/habits').then(module => ({ default: module.HabitsPage })));
const InsightsPage = lazy(() => import('@/pages/insights').then(module => ({ default: module.InsightsPage })));
const SettingsPage = lazy(() => import('@/pages/settings').then(module => ({ default: module.SettingsPage })));
const NotFoundPage = lazy(() => import('@/pages/not-found').then(module => ({ default: module.NotFoundPage })));

class PageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? <PageFailure /> : this.props.children; }
}
function PageFailure() {
  const { t } = useTranslation();
  return <div role="alert" className="p-6"><p>{t('errors.generic')}</p><button className="mt-3 underline" onClick={() => window.location.reload()}>{t('recovery.reload')}</button></div>;
}
function PageLoading() { const { t } = useTranslation(); return <p role="status" className="p-6">{t('recovery.loading')}</p>; }

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ToastProvider>
          <PageBoundary><Suspense fallback={<PageLoading />}><Routes>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="planner" element={<PlannerPage />} />
              <Route path="simulation" element={<SimulationPage />} />
              <Route path="habits" element={<HabitsPage />} />
              <Route path="insights" element={<InsightsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes></Suspense></PageBoundary>
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
