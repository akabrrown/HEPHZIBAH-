import crypto from "node:crypto";
import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  DATABASE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  SESSION_SECRET: z.string().optional().default(""),
  TOKEN_HASH_PEPPER: z.string().optional().default(""),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default("Hephzibah Media <desk@hephzibahmedia.com>"),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional().default(""),
  CRON_SECRET: z.string().optional().default(""),
  PGLITE_DATA_DIR: z.string().optional().default(""),
});

let cachedServerEnv: z.infer<typeof serverEnvSchema> | null = null;

declare global {
  var __hephzibahEphemeralSessionSecret: string | undefined;
  var __hephzibahEphemeralTokenPepper: string | undefined;
}

export function getServerEnv() {
  if (cachedServerEnv) return cachedServerEnv;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export function getSessionSecret(): string {
  const env = getServerEnv();
  if (env.SESSION_SECRET.length >= 32) {
    return env.SESSION_SECRET;
  }
  if (env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be at least 32 characters in production");
  }
  if (!globalThis.__hephzibahEphemeralSessionSecret) {
    globalThis.__hephzibahEphemeralSessionSecret = crypto.randomBytes(32).toString("hex");
  }
  return globalThis.__hephzibahEphemeralSessionSecret;
}

export function getTokenPepper(): string {
  const env = getServerEnv();
  if (env.TOKEN_HASH_PEPPER.length >= 32) {
    return env.TOKEN_HASH_PEPPER;
  }
  if (env.NODE_ENV === "production") {
    throw new Error("TOKEN_HASH_PEPPER must be at least 32 characters in production");
  }
  if (!globalThis.__hephzibahEphemeralTokenPepper) {
    globalThis.__hephzibahEphemeralTokenPepper = crypto.randomBytes(32).toString("hex");
  }
  return globalThis.__hephzibahEphemeralTokenPepper;
}
