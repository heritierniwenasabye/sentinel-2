import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from '@/hooks/use-app';
import { ToastProvider } from '@/components/ui/toast';
import { AppShell } from '@/components/layout/app-shell';
import { OverviewPage } from '@/pages/overview';
import { PlannerPage } from '@/pages/planner';
import { SimulationPage } from '@/pages/simulation';
import { HabitsPage } from '@/pages/habits';
import { InsightsPage } from '@/pages/insights';
import { SettingsPage } from '@/pages/settings';
import { NotFoundPage } from '@/pages/not-found';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ToastProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="planner" element={<PlannerPage />} />
              <Route path="simulation" element={<SimulationPage />} />
              <Route path="habits" element={<HabitsPage />} />
              <Route path="insights" element={<InsightsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
