import { Suspense } from "react";
import { SignInContent } from "./SignInContent";
import { getRegistrationEnabled } from "@/db/queries/settings";

export default function SignInPage() {
  const registrationEnabled = getRegistrationEnabled();

  return (
    <Suspense>
      <SignInContent registrationEnabled={registrationEnabled} />
    </Suspense>
  );
}
