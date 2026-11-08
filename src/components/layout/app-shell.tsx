import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { useApp } from '@/hooks/use-app';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

export function AppShell() {
  const { t } = useTranslation();
  const { storageAvailable } = useApp();

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        {t('a11y.skipToContent')}
      </a>
      <Sidebar />
      <div className="flex min-h-dvh flex-col lg:pl-sidebar">
        <Header />
        {!storageAvailable ? (
          <p
            role="status"
            className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs text-warning sm:px-6 lg:px-8"
          >
            {t('errors.storage')}
          </p>
        ) : null}
        <main
          id="main-content"
          className="mx-auto w-full max-w-content flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <Outlet />
        </main>
        <OnboardingWizard />
        <footer className="mx-auto w-full max-w-content px-4 pb-6 sm:px-6 lg:px-8">
          <p className="border-t border-border pt-4 text-2xs text-muted-foreground">
            {t('app.name')} {t('app.version')} — {t('app.tagline')}
          </p>
        </footer>
      </div>
    </div>
  );
}
