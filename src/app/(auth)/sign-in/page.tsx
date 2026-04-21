"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/webauthn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Access denied. This account is not allowed.",
  Configuration: "Server configuration error. Please try again later.",
  Verification: "The sign-in link has expired.",
};

function authErrorMessage(code: string): string {
  return AUTH_ERROR_MESSAGES[code] ?? "Sign in failed. Your passkey may not be registered on this device.";
}

function SignInContent() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayError = error ?? (urlError ? authErrorMessage(urlError) : null);

  async function handleAuthenticate() {
    setError(null);
    try {
      await signIn("passkey", { action: "authenticate", callbackUrl: "/" });
    } catch (e) {
      if (e instanceof Error && e.message !== "NEXT_REDIRECT") {
        setError("Sign in failed. Your passkey may not be registered on this device.");
      }
    }
  }

  async function handleRegister() {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email to register a passkey.");
      return;
    }
    setRegistering(true);
    try {
      await signIn("passkey", { action: "register", email: trimmed, callbackUrl: "/" });
    } catch (e) {
      if (e instanceof Error && e.message !== "NEXT_REDIRECT") {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setRegistering(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Journal</CardTitle>
          <CardDescription>Your private space</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <Button onClick={handleAuthenticate} size="lg" className="w-full">
            Sign in with passkey
          </Button>

          <Separator />

          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground text-center">First time? Register a passkey</p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <Button
              onClick={handleRegister}
              disabled={registering}
              variant="outline"
              size="lg"
              className="w-full"
            >
              {registering ? "Registering…" : "Register passkey"}
            </Button>
          </div>

          {displayError && (
            <p className="text-xs text-destructive text-center">{displayError}</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
