export const dynamic = 'force-dynamic';

import { ProfileForm } from '@/components/profile/ProfileForm';
import { getProfileBio, listProfileQa } from '@/db/queries/profile';

export default function ProfilePage() {
  const bio = getProfileBio();
  const qaItems = listProfileQa();

  return (
    <div className='mx-auto max-w-2xl space-y-6 px-4 py-8'>
      <div className='space-y-1'>
        <h1 className='text-xl font-semibold tracking-tight'>Rólam</h1>
        <p className='text-sm text-muted-foreground'>
          Írd le magadról, ami segíthet a naplónak személyre szabott kérdéseket feltenni — pl.
          munkád, családod, hobbijaid, rendszeres szokásaid.
        </p>
      </div>
      <ProfileForm initialBio={bio} initialQaItems={qaItems} />
    </div>
  );
}

