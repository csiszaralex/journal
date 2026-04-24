import { getRegistrationEnabled } from '@/db/queries/settings';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { SignInContent } from './SignInContent';

export default async function SignInPage() {
  const session = await auth();
  if (session) redirect('/');

  const registrationEnabled = getRegistrationEnabled();

  return (
    <Suspense>
      <SignInContent registrationEnabled={registrationEnabled} />
    </Suspense>
  );
}

