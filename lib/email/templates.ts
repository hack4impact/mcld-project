import type { TimeSlot } from "@/lib/scheduling/time-slot";

const LOGO_URL = "https://upload.storylife.fr/i/01KT1V0H9B80F2GP3WE2BG3SAN.png";
const BRAND = "#3B82F6";
const TIMEZONE = process.env.EMAIL_TIMEZONE;

function formatSlot(slot: TimeSlot): string {
   const start = new Date(slot.start);
   const end = new Date(slot.end);
   const day = start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: TIMEZONE,
   });
   const time = (d: Date) =>
      d.toLocaleTimeString("en-US", {
         hour: "numeric",
         minute: "2-digit",
         timeZone: TIMEZONE,
      });
   return `${day}, ${time(start)} – ${time(end)}`;
}

function slotList(slots: TimeSlot[]): string {
   return `<ul style="margin:12px 0;padding-left:20px;color:#111;">${slots
      .map((s) => `<li style="margin:4px 0;">${formatSlot(s)}</li>`)
      .join("")}</ul>`;
}

function button(url: string, label: string): string {
   return `<a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 22px;background:${BRAND};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">${label}</a>`;
}

function shell(title: string, body: string): string {
   return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;line-height:1.5;">
   <img src="${LOGO_URL}" alt="MCLD" width="120" style="display:block;margin:0 auto 20px;height:auto;" />
   <h1 style="font-size:20px;margin:0 0 16px;">${title}</h1>
   ${body}
   <p style="margin-top:24px;font-size:12px;color:#888;">If you weren't expecting this email, you can safely ignore it.</p>
</div>`;
}

export type EmailContent = { subject: string; html: string; text: string };

export function coachInviteEmail(params: {
   coachName: string;
   clientName: string;
   serviceTitle: string;
   clientSlots: TimeSlot[];
   url: string;
}): EmailContent {
   const { coachName, clientName, serviceTitle, clientSlots, url } = params;
   const subject = `New private lesson booked - pick your availability`;

   const MAX_LISTED = 6;
   const availabilityHtml =
      clientSlots.length > MAX_LISTED
         ? `<p><strong>${clientName}</strong> shared <strong>${clientSlots.length}</strong> time windows, open the calendar below to see them all and mark yours.</p>`
         : `<p>Here are the time windows they're available:</p>${slotList(clientSlots)}`;
   const availabilityText =
      clientSlots.length > MAX_LISTED
         ? `${clientName} shared ${clientSlots.length} time windows — open the calendar to see them all.`
         : `Their availability:\n${clientSlots
              .map((s) => `- ${formatSlot(s)}`)
              .join("\n")}`;

   const html = shell(
      `New private lesson booked`,
      `<p>Hi ${coachName},</p>
       <p><strong>${clientName}</strong> just booked and paid for <strong>${serviceTitle}</strong>.</p>
       ${availabilityHtml}
       <p>Open the calendar below to mark when <em>you're</em> available. We'll show ${clientName} the overlapping times so they can lock one in.</p>
       ${button(url, "Set your availability")}
       <p style="font-size:13px;color:#666;">Or paste this link into your browser:<br/>${url}</p>`,
   );
   const text = `Hi ${coachName}, ${clientName} booked ${serviceTitle}.\n${availabilityText}\n\nSet your availability: ${url}`;
   return { subject, html, text };
}

export function clientPickEmail(params: {
   clientName: string;
   coachName: string;
   serviceTitle: string;
   overlap: TimeSlot[];
   url: string;
}): EmailContent {
   const { clientName, coachName, serviceTitle, overlap, url } = params;
   const subject = `Pick your time for ${serviceTitle}`;
   const html = shell(
      `Choose your session time`,
      `<p>Hi ${clientName},</p>
       <p>${coachName} reviewed your availability for <strong>${serviceTitle}</strong>. These windows work for both of you:</p>
       ${slotList(overlap)}
       <p>Open the link below to pick your exact start time and confirm your session.</p>
       ${button(url, "Choose your time")}
       <p style="font-size:13px;color:#666;">Or paste this link into your browser:<br/>${url}</p>`,
   );
   const text = `Hi ${clientName}, ${coachName} is available at these overlapping times for ${serviceTitle}:\n${overlap
      .map((s) => `- ${formatSlot(s)}`)
      .join("\n")}\n\nChoose your time: ${url}`;
   return { subject, html, text };
}

export function confirmationEmail(params: {
   recipientName: string;
   otherPartyName: string;
   serviceTitle: string;
   slot: TimeSlot;
}): EmailContent {
   const { recipientName, otherPartyName, serviceTitle, slot } = params;
   const subject = `Confirmed: ${serviceTitle} on ${formatSlot(slot)}`;
   const html = shell(
      `Your session is confirmed`,
      `<p>Hi ${recipientName},</p>
       <p>Your <strong>${serviceTitle}</strong> session with <strong>${otherPartyName}</strong> is confirmed for:</p>
       <p style="font-size:16px;font-weight:600;margin:12px 0;">${formatSlot(slot)}</p>
       <p>See you then!</p>`,
   );
   const text = `Hi ${recipientName}, your ${serviceTitle} session with ${otherPartyName} is confirmed for ${formatSlot(slot)}.`;
   return { subject, html, text };
}
