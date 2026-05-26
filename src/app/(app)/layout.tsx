import { AppNav } from '@/components/journal/AppNav';
import { InactivityTimer } from '@/components/journal/InactivityTimer';
import { KeyboardShortcuts } from '@/components/journal/KeyboardShortcuts';
import { OfflineIndicator } from '@/components/journal/OfflineIndicator';
import { QueryProvider } from '@/components/query-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/sign-in');

  return (
    <QueryProvider>
      <TooltipProvider>
        <AppNav />
        <div className='flex-1'>
          <div className='mx-auto max-w-2xl space-y-6 px-4 py-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-4'>
            {children}
          </div>
        </div>
        <KeyboardShortcuts />
        <InactivityTimer />
        <OfflineIndicator />
      </TooltipProvider>
    </QueryProvider>
  );
}

