import { getRegistrationEnabled } from '@/db/queries/settings';
import { Suspense } from 'react';
import { SignInContent } from './SignInContent';

export default function SignInPage() {
  const registrationEnabled = getRegistrationEnabled();

  return (
    <Suspense>
      <SignInContent registrationEnabled={registrationEnabled} />
    </Suspense>
  );
}

