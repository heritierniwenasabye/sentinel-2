import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  CalendarRange,
  FlaskConical,
  LayoutDashboard,
  Settings,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
}

export const WORKSPACE_NAV: NavItem[] = [
  { to: '/', labelKey: 'nav.overview', icon: LayoutDashboard, end: true },
  { to: '/planner', labelKey: 'nav.planner', icon: CalendarRange },
  { to: '/simulation', labelKey: 'nav.simulation', icon: FlaskConical },
  { to: '/habits', labelKey: 'nav.habits', icon: Smartphone },
  { to: '/insights', labelKey: 'nav.insights', icon: Activity },
];

const SYSTEM_NAV: NavItem[] = [{ to: '/settings', labelKey: 'nav.settings', icon: Settings }];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();

  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <li key={item.to}>
        <NavLink
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
              isActive
                ? 'bg-nav-active font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
          aria-current={undefined}
        >
          {({ isActive }) => (
            <>
              <Icon
                aria-hidden="true"
                className={cn('size-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}
                strokeWidth={1.75}
              />
              <span className="truncate">{t(item.labelKey)}</span>
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                />
              ) : null}
            </>
          )}
        </NavLink>
      </li>
    );
  };

  return (
    <nav aria-label={t('a11y.primaryNavigation')} className="flex flex-1 flex-col gap-6">
      <div>
        <p className="label-caps px-2.5 pb-2">{t('nav.workspace')}</p>
        <ul className="flex flex-col gap-0.5">{WORKSPACE_NAV.map(renderLink)}</ul>
      </div>
      <div>
        <p className="label-caps px-2.5 pb-2">{t('nav.system')}</p>
        <ul className="flex flex-col gap-0.5">{SYSTEM_NAV.map(renderLink)}</ul>
      </div>
    </nav>
  );
}

export function SidebarBrand({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  return (
    <NavLink
      to="/"
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-md p-1"
      aria-label={t('a11y.brandHome')}
    >
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold tracking-tight text-primary-foreground"
      >
        S2
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold tracking-[0.02em] text-foreground">
            {t('app.name')}
          </span>
          <span className="text-2xs font-medium text-muted-foreground">{t('app.version')}</span>
        </span>
        <span className="truncate text-2xs text-muted-foreground">{t('app.subtitle')}</span>
      </span>
    </NavLink>
  );
}

export function SidebarFooter() {
  const { t } = useTranslation();
  return (
    <div className="mt-auto border-t border-border px-1 pt-4">
      <p className="text-xs font-medium text-foreground">
        {t('app.name')} {t('app.version')}
      </p>
      <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">{t('app.tagline')}</p>
      <p className="mt-3 flex items-start gap-1.5 text-2xs leading-relaxed text-muted-foreground">
        <span aria-hidden="true" className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
        {t('settings.data.localNotice')}
      </p>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col border-r border-border bg-sidebar px-3 py-4 lg:flex">
      <div className="px-1">
        <SidebarBrand />
      </div>
      <div className="mt-6 flex flex-1 flex-col overflow-y-auto scroll-area px-0.5">
        <SidebarNav />
        <SidebarFooter />
      </div>
    </aside>
  );
}
