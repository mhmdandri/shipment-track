import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  WAHA_API_URL: z.string().url().optional(),
  WAHA_SESSION: z.string().default("default"),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_CHAT_ID: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
