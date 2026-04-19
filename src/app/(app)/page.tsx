import { signOutAction } from "@/actions/auth";

export default function TodayPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p>Today — coming in Phase 5</p>
      <form action={signOutAction}>
        <button type="submit" className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-200 text-sm hover:bg-neutral-700 transition-colors cursor-pointer">
          Sign out
        </button>
      </form>
    </main>
  );
}
