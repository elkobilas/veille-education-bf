import "dotenv/config";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${key}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",

  // E-mail
  SMTP_HOST: process.env.SMTP_HOST ?? "smtp.gmail.com",
  SMTP_PORT: Number(process.env.SMTP_PORT ?? "587"),
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? "",

  NOTIFICATION_EMAIL: process.env.NOTIFICATION_EMAIL ?? "",

  // Canal de notification : "email" | "whatsapp" | "both"
  NOTIFICATION_CHANNEL: process.env.NOTIFICATION_CHANNEL ?? "email",

  // WhatsApp
  WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER ?? "", // "callmebot" ou "twilio"
  WHATSAPP_PHONE: process.env.WHATSAPP_PHONE ?? "",
  WHATSAPP_CALLMEBOT_APIKEY: process.env.WHATSAPP_CALLMEBOT_APIKEY ?? "",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ?? "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ?? "",
  TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM ?? "",

  // IA : DeepSeek ou OpenAI (DeepSeek prioritaire si les deux sont configurés)
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ?? "",
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4o-mini",

  // Scraping
  SCRAPE_INTERVAL_MINUTES: Number(process.env.SCRAPE_INTERVAL_MINUTES ?? "60"),
  SCRAPE_URLS: process.env.SCRAPE_URLS ?? "",
} as const;
