"use client";

import { signIn } from "next-auth/webauthn";

export default function SignInPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4 bg-neutral-950 text-neutral-100">
      <div className="flex flex-col items-center gap-8 p-10 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl w-full max-w-sm">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
          <p className="text-sm text-neutral-400">Your private space</p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => signIn("passkey", { action: "authenticate" })}
            className="w-full px-4 py-2.5 rounded-lg bg-neutral-100 text-neutral-900 font-medium text-sm hover:bg-white transition-colors cursor-pointer"
          >
            Sign in with passkey
          </button>
          <button
            onClick={() => signIn("passkey", { action: "register" })}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-700 text-neutral-300 font-medium text-sm hover:border-neutral-500 hover:text-neutral-100 transition-colors cursor-pointer"
          >
            Register passkey
          </button>
        </div>
      </div>
    </main>
  );
}
