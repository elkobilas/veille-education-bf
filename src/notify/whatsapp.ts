import type { CommuniqueNotification } from "@/scraper/types";

// ---------------------------------------------------------------------------
// CallMeBot (gratuit)
// ---------------------------------------------------------------------------

interface CallMeBotConfig {
  apiKey: string;
  phone: string; // format: 226XXXXXXXX (sans +)
}

async function sendViaCallMeBot(
  config: CallMeBotConfig,
  communique: CommuniqueNotification
): Promise<void> {
  const message = buildWhatsAppMessage(communique);

  const url = `https://api.callmebot.com/whatsapp.php?phone=${config.phone}&text=${encodeURIComponent(message)}&apikey=${config.apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CallMeBot error ${res.status}: ${text}`);
  }

  console.log(`[whatsapp:callmebot] Message envoyé : "${communique.title}"`);
}

// ---------------------------------------------------------------------------
// Twilio (officiel, payant)
// ---------------------------------------------------------------------------

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  from: string; // numéro Twilio, ex: +14155238886
  to: string;   // numéro destinataire, ex: +226XXXXXXXX
}

async function sendViaTwilio(
  config: TwilioConfig,
  communique: CommuniqueNotification
): Promise<void> {
  const message = buildWhatsAppMessage(communique);

  const body = new URLSearchParams({
    From: `whatsapp:${config.from}`,
    To: `whatsapp:${config.to}`,
    Body: message,
  });

  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio error ${res.status}: ${text}`);
  }

  console.log(`[whatsapp:twilio] Message envoyé : "${communique.title}"`);
}

// ---------------------------------------------------------------------------
// Point d'entrée unique
// ---------------------------------------------------------------------------

export async function sendWhatsAppNotification(
  communique: CommuniqueNotification
): Promise<void> {
  const channel = process.env.WHATSAPP_PROVIDER?.toLowerCase();

  // CallMeBot
  if (channel === "callmebot") {
    const apiKey = process.env.WHATSAPP_CALLMEBOT_APIKEY;
    const phone = process.env.WHATSAPP_PHONE;

    if (!apiKey || !phone) {
      throw new Error("WHATSAPP_CALLMEBOT_APIKEY et WHATSAPP_PHONE requis pour CallMeBot");
    }

    await sendViaCallMeBot({ apiKey, phone }, communique);
    return;
  }

  // Twilio
  if (channel === "twilio") {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    const to = process.env.WHATSAPP_PHONE;

    if (!accountSid || !authToken || !from || !to) {
      throw new Error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM et WHATSAPP_PHONE requis pour Twilio");
    }

    await sendViaTwilio({ accountSid, authToken, from, to }, communique);
    return;
  }

  throw new Error(`Fournisseur WhatsApp inconnu : ${channel}. Utiliser "callmebot" ou "twilio".`);
}

// ---------------------------------------------------------------------------
// Message formaté WhatsApp
// ---------------------------------------------------------------------------

function buildWhatsAppMessage(c: CommuniqueNotification): string {
  return `
📢 *${escapeWA(c.title)}*

📌 Source : ${escapeWA(c.sourceName)}

📝 Résumé :
${escapeWA(c.summary)}

👥 Personnes concernées :
${escapeWA(c.targetAudience)}

📅 Dates importantes :
${escapeWA(c.importantDates)}

📋 Pièces à fournir :
${escapeWA(c.requiredDocs)}

📆 Publié le : ${escapeWA(c.publishedAt)}

🔗 ${c.url}
`.trim();
}

function escapeWA(text: string): string {
  return text
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/~/g, "\\~")
    .replace(/`/g, "\\`");
}
