export const dynamic = 'force-dynamic';

import { ProfileForm } from '@/components/profile/ProfileForm';
import { getProfileBio, listProfileQa } from '@/db/queries/profile';
import { getDict } from '@/i18n/request';

export default async function ProfilePage() {
  const d = await getDict();
  const bio = getProfileBio();
  const qaItems = listProfileQa();

  return (
    <div className='mx-auto max-w-2xl space-y-6 px-4 py-8'>
      <div className='space-y-1'>
        <h1 className='text-xl font-semibold tracking-tight'>{d.profile.title}</h1>
        <p className='text-sm text-muted-foreground'>{d.profile.intro}</p>
      </div>
      <ProfileForm initialBio={bio} initialQaItems={qaItems} />
    </div>
  );
}

