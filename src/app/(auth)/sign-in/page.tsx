"use client";

import { useState } from "react";
import { signIn } from "next-auth/webauthn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAuthenticate() {
    setError(null);
    try {
      await signIn("passkey", { action: "authenticate", callbackUrl: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
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
      setError(e instanceof Error ? e.message : "Registration failed");
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

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
