'use client';

import { INACTIVITY_TIMEOUT_MINUTES } from '@/lib/inactivity-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/i18n/provider';
import { signIn } from 'next-auth/webauthn';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface Props {
  registrationEnabled: boolean;
}

export function SignInContent({ registrationEnabled }: Props) {
  const d = useI18n();
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const reason = searchParams.get('reason');

  const [email, setEmail] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The sentences for the codes NextAuth can redirect with live in the
  // dictionary; this widening is what lets an arbitrary `?error=` value be
  // looked up in them, with one fallback for everything unlisted. It has to
  // happen in the component body — the map used to be a module constant, which
  // could never read the dictionary hook.
  const byCode: Record<string, string | undefined> = d.auth.errors.byCode;

  const displayError =
    error ?? (urlError ? (byCode[urlError] ?? d.auth.errors.signInFailed) : null);
  const inactivityMessage =
    reason === 'inactivity' ? d.auth.signedOutForInactivity(INACTIVITY_TIMEOUT_MINUTES) : null;

  async function handleAuthenticate() {
    setError(null);
    try {
      await signIn('passkey', { action: 'authenticate', callbackUrl: '/' });
    } catch (e) {
      if (e instanceof Error && e.message !== 'NEXT_REDIRECT') {
        setError(d.auth.errors.signInFailed);
      }
    }
  }

  async function handleRegister(e?: React.SubmitEvent) {
    e?.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError(d.auth.errors.emailRequired);
      return;
    }
    setRegistering(true);
    try {
      await signIn('passkey', { action: 'register', email: trimmed, callbackUrl: '/' });
    } catch (e) {
      if (e instanceof Error && e.message !== 'NEXT_REDIRECT') {
        setError(d.auth.errors.registrationFailed);
      }
    } finally {
      setRegistering(false);
    }
  }

  return (
    <main className='flex min-h-screen items-center justify-center bg-background px-2 md:px-4'>
      <Card className='w-full max-w-sm'>
        <CardHeader className='text-center'>
          {/* The product's name, not a translatable string. */}
          <CardTitle className='text-2xl'>Journal</CardTitle>
          <CardDescription>{d.auth.tagline}</CardDescription>
        </CardHeader>

        <CardContent className='flex flex-col gap-4'>
          <Button onClick={handleAuthenticate} size='lg' className='w-full' autoFocus>
            {d.auth.signInWithPasskey}
          </Button>

          {registrationEnabled && (
            <>
              <Separator />
              <form onSubmit={handleRegister} className='flex flex-col gap-3'>
                <p className='text-xs text-muted-foreground text-center'>
                  {d.auth.register.invitation}
                </p>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='email'>{d.auth.register.emailLabel}</Label>
                  <Input
                    id='email'
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={d.auth.register.emailPlaceholder}
                  />
                </div>
                <Button
                  type='submit'
                  disabled={registering}
                  variant='outline'
                  size='lg'
                  className='w-full'
                >
                  {registering ? d.auth.register.submitting : d.auth.register.submit}
                </Button>
              </form>
            </>
          )}

          {inactivityMessage && (
            <p className='text-xs text-muted-foreground text-center'>{inactivityMessage}</p>
          )}
          {displayError && <p className='text-xs text-destructive text-center'>{displayError}</p>}
        </CardContent>
      </Card>
    </main>
  );
}

