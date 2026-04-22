import { AppNav } from '@/components/journal/AppNav';
import { InactivityTimer } from '@/components/journal/InactivityTimer';
import { KeyboardShortcuts } from '@/components/journal/KeyboardShortcuts';
import { OfflineIndicator } from '@/components/journal/OfflineIndicator';
import { QueryProvider } from '@/components/query-provider';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/sign-in');

  return (
    <QueryProvider>
      <AppNav />
      <div className='flex-1'>{children}</div>
      <KeyboardShortcuts />
      <InactivityTimer />
      <OfflineIndicator />
    </QueryProvider>
  );
}

