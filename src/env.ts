import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().default("file:./data/journal.db"),
    AUTH_SECRET: z.string().min(1),
    AUTH_URL: z.url().optional(),
    VAPID_PUBLIC_KEY: z.string().min(1),
    VAPID_PRIVATE_KEY: z.string().min(1),
    VAPID_SUBJECT: z.string().min(1),
    ALLOWED_EMAIL: z.email(),
  },
  client: {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
    ALLOWED_EMAIL: process.env.ALLOWED_EMAIL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
