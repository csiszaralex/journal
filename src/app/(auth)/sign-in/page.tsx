"use client";

import { useState } from "react";
import { signIn } from "next-auth/webauthn";

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
    <main className="flex flex-col items-center justify-center min-h-screen gap-4 bg-neutral-950 text-neutral-100">
      <div className="flex flex-col items-center gap-6 p-10 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl w-full max-w-sm">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
          <p className="text-sm text-neutral-400">Your private space</p>
        </div>

        <button
          onClick={handleAuthenticate}
          className="w-full px-4 py-2.5 rounded-lg bg-neutral-100 text-neutral-900 font-medium text-sm hover:bg-white transition-colors cursor-pointer"
        >
          Sign in with passkey
        </button>

        <div className="w-full border-t border-neutral-800" />

        <div className="flex flex-col gap-3 w-full">
          <p className="text-xs text-neutral-500 text-center">First time? Register a passkey</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500"
          />
          <button
            onClick={handleRegister}
            disabled={registering}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-700 text-neutral-300 font-medium text-sm hover:border-neutral-500 hover:text-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            {registering ? "Registering…" : "Register passkey"}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}
      </div>
    </main>
  );
}
