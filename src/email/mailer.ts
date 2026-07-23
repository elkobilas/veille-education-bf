import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import type { CommuniqueNotification } from "@/scraper/types";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendNotification(
  communique: CommuniqueNotification
): Promise<void> {
  if (!env.SMTP_USER || !env.NOTIFICATION_EMAIL) {
    console.log("[mailer] SMTP non configuré, e-mail ignoré.");
    return;
  }

  const html = buildEmailHtml(communique);

  await getTransporter().sendMail({
    from: `"Veille Éducation BF" <${env.SMTP_USER}>`,
    to: env.NOTIFICATION_EMAIL,
    subject: `📢 ${communique.title}`,
    html,
  });

  console.log(`[mailer] E-mail envoyé : "${communique.title}"`);
}

function buildEmailHtml(c: CommuniqueNotification): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f5f5f5; margin:0; padding:0; }
    .container { max-width:600px; margin:20px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
    .header { background:#1a6b3c; color:#fff; padding:24px; }
    .header h1 { margin:0; font-size:20px; }
    .body { padding:24px; }
    .field { margin-bottom:16px; }
    .field-label { font-weight:600; color:#333; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; }
    .field-value { margin-top:4px; color:#555; line-height:1.6; }
    .footer { background:#fafafa; padding:16px 24px; text-align:center; font-size:12px; color:#999; border-top:1px solid #eee; }
    a { color:#1a6b3c; }
    .badge { display:inline-block; background:#e8f5e9; color:#1a6b3c; padding:2px 8px; border-radius:4px; font-size:13px; margin:2px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📢 Nouveau communiqué</h1>
      <p style="margin:8px 0 0; opacity:0.85;">Source : ${escapeHtml(c.sourceName)}</p>
    </div>
    <div class="body">
      <div class="field">
        <div class="field-label">📌 Titre</div>
        <div class="field-value"><strong>${escapeHtml(c.title)}</strong></div>
      </div>
      <div class="field">
        <div class="field-label">📝 Résumé</div>
        <div class="field-value">${escapeHtml(c.summary)}</div>
      </div>
      <div class="field">
        <div class="field-label">👥 Personnes concernées</div>
        <div class="field-value">${escapeHtml(c.targetAudience)}</div>
      </div>
      <div class="field">
        <div class="field-label">📅 Dates importantes</div>
        <div class="field-value">${escapeHtml(c.importantDates)}</div>
      </div>
      <div class="field">
        <div class="field-label">📋 Pièces à fournir</div>
        <div class="field-value">${escapeHtml(c.requiredDocs)}</div>
      </div>
      <div class="field">
        <div class="field-label">📆 Date de publication</div>
        <div class="field-value">${escapeHtml(c.publishedAt)}</div>
      </div>
      <div style="margin-top:24px; padding-top:16px; border-top:1px solid #eee;">
        <a href="${escapeHtml(c.url)}" style="display:inline-block; background:#1a6b3c; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">
          🔗 Voir le communiqué officiel
        </a>
      </div>
    </div>
    <div class="footer">
      Veille Éducation Burkina Faso — Notification automatique<br>
      Pour modifier les paramètres, connectez-vous au dashboard.
    </div>
  </div>
</body>
</html>`.trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
