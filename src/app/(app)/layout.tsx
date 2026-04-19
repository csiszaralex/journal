import { AppNav } from '@/components/journal/AppNav';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/sign-in');

  return (
    <>
      <AppNav />
      <div className='flex-1'>{children}</div>
    </>
  );
}

