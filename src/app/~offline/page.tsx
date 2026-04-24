export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center'>
      <div className='text-4xl'>📡</div>
      <h1 className='text-xl font-semibold'>You&apos;re offline</h1>
      <p className='text-sm text-muted-foreground'>
        This page isn&apos;t available offline yet. Connect to the internet and reload.
      </p>
    </div>
  );
}

