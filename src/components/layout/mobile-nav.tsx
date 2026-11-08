import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarBrand, SidebarFooter, SidebarNav } from '@/components/layout/sidebar';

/** Accessible slide-in navigation drawer for small and medium viewports. */
export function MobileNav() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={t('header.menu')}
        >
          <Menu aria-hidden="true" className="size-5" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 lg:hidden" />
        <DialogPrimitive.Content
          className="scroll-area fixed inset-y-0 left-0 z-50 flex h-dvh w-[280px] max-w-[86vw] flex-col border-r border-border bg-sidebar px-3 py-4 shadow-lg focus:outline-none lg:hidden"
        >
          <DialogPrimitive.Title className="sr-only">{t('nav.workspace')}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {t('header.menu')}
          </DialogPrimitive.Description>
          <div className="px-1">
            <SidebarBrand onNavigate={() => setOpen(false)} />
          </div>
          <div className="mt-6 flex flex-1 flex-col overflow-y-auto scroll-area px-0.5">
            <SidebarNav onNavigate={() => setOpen(false)} />
            <SidebarFooter />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
