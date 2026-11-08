import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Check, Languages, Monitor, Moon, Sun } from 'lucide-react';
import type { Theme } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApp } from '@/hooks/use-app';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { WORKSPACE_NAV } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: { value: Theme; labelKey: string; icon: typeof Sun }[] = [
  { value: 'light', labelKey: 'header.light', icon: Sun },
  { value: 'dark', labelKey: 'header.dark', icon: Moon },
  { value: 'system', labelKey: 'header.system', icon: Monitor },
];

export function Header() {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = useApp();
  const location = useLocation();

  const activeItem =
    WORKSPACE_NAV.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to))) ??
    (location.pathname.startsWith('/settings') ? { labelKey: 'nav.settings' } : null);

  const currentTheme = THEME_OPTIONS.find((option) => option.value === preferences.theme) ?? THEME_OPTIONS[2];
  const CurrentThemeIcon = currentTheme.icon;
  const currentLanguage =
    SUPPORTED_LANGUAGES.find((language) => language.code === preferences.language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background px-4 sm:px-6 lg:px-8">
      <MobileNav />
      <p className="min-w-0 truncate text-xs text-muted-foreground">
        <span className="sm:hidden">{t('app.name')}</span>
        <span aria-hidden="true" className="sm:hidden">
          {' · '}
        </span>
        <span>{activeItem ? t(activeItem.labelKey) : t('app.name')}</span>
      </p>

      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('header.changeLanguage')}
              title={t('header.language')}
              className="gap-1.5 px-2"
            >
              <Languages aria-hidden="true" className="size-4" />
              <span className="hidden text-xs sm:inline">{currentLanguage.label}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('header.language')}</DropdownMenuLabel>
            {SUPPORTED_LANGUAGES.map((language) => (
              <DropdownMenuItem
                key={language.code}
                onSelect={() => updatePreferences({ language: language.code })}
                className="justify-between"
              >
                <span>{language.label}</span>
                {preferences.language === language.code ? (
                  <Check aria-hidden="true" className="size-3.5 text-primary" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenuSeparator className="hidden" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('header.changeTheme')}
              title={t('header.appearance')}
              className="gap-1.5 px-2"
            >
              <CurrentThemeIcon aria-hidden="true" className="size-4" />
              <span className="hidden text-xs sm:inline">{t(currentTheme.labelKey)}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('header.appearance')}</DropdownMenuLabel>
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => updatePreferences({ theme: option.value })}
                  className="justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Icon aria-hidden="true" className={cn('size-3.5 text-muted-foreground')} />
                    {t(option.labelKey)}
                  </span>
                  {preferences.theme === option.value ? (
                    <Check aria-hidden="true" className="size-3.5 text-primary" />
                  ) : null}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
