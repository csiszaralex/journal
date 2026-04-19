import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export default function TodayPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Today — coming in Phase 5</p>
      <form action={signOutAction}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}
