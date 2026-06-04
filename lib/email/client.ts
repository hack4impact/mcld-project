import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

const host = process.env.BREVO_SMTP_HOST;
const port = Number(process.env.BREVO_SMTP_PORT ?? 587);
const user = process.env.BREVO_SMTP_USER;
const pass = process.env.BREVO_SMTP_PASSWORD;

let cached: Transporter | null = null;

function getTransporter(): Transporter {
   if (!host || !user || !pass) {
      throw new Error(
         "Missing Brevo SMTP config (BREVO_SMTP_HOST / BREVO_SMTP_USER / BREVO_SMTP_PASSWORD) check .env.example",
      );
   }
   if (!cached) {
      cached = nodemailer.createTransport({
         host,
         port,
         secure: port === 465,
         auth: { user, pass },
      });
   }
   return cached;
}

export type SendEmailParams = {
   to: string;
   subject: string;
   html: string;
   text?: string;
};

export async function sendEmail({
   to,
   subject,
   html,
   text,
}: SendEmailParams): Promise<void> {
   const from = process.env.EMAIL_FROM;
   await getTransporter().sendMail({ from, to, subject, html, text });
}

export function appUrl(path: string): string {
   const base = (process.env.APP_URL ?? "http://localhost:3000").replace(
      /\/$/,
      "",
   );
   return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
