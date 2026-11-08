import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="label-caps">404</p>
      <h1 className="mt-2 text-xl font-semibold">{t('errors.notFoundTitle')}</h1>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{t('errors.notFoundBody')}</p>
      <Button asChild className="mt-5">
        <Link to="/">
          <ArrowLeft aria-hidden="true" />
          {t('errors.goHome')}
        </Link>
      </Button>
    </div>
  );
}
