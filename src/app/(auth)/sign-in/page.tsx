import { isRegistrationAllowed } from '@/db/queries/settings';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { SignInContent } from './SignInContent';

export default async function SignInPage() {
  const session = await auth();
  if (session) redirect('/');

  // Same rule the sign-in callback enforces, so the form is shown exactly when
  // it would actually work: during first-time bootstrap, or when enabled.
  const registrationEnabled = isRegistrationAllowed();

  return (
    <Suspense>
      <SignInContent registrationEnabled={registrationEnabled} />
    </Suspense>
  );
}

