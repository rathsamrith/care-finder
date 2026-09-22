// Plain transactional templates. All interpolated values go through esc() -
// patient names, hospital names and titles are user-controlled.
export const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

const layout = (title: string, bodyHtml: string, cta?: { label: string; url: string }) => `<!doctype html>
<html><body style="margin:0;background:#f7f9f8;font-family:Arial,Helvetica,sans-serif;color:#17201d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
<tr><td style="padding:24px 28px;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#176b5b">Care Finder</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:20px">${esc(title)}</h1>
${bodyHtml}
${cta ? `<p style="margin:24px 0 0"><a href="${esc(cta.url)}" style="display:inline-block;background:#176b5b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">${esc(cta.label)}</a></p>` : ''}
</td></tr></table></td></tr></table></body></html>`;

const p = (text: string) => `<p style="margin:0 0 12px;line-height:1.6">${text}</p>`;

export function resetPasswordMail(name: string, url: string, ttlMinutes: number): MailContent {
  return {
    subject: 'Reset your Care Finder password',
    text: `Hi ${name},\n\nUse this link to choose a new password (valid for ${ttlMinutes} minutes):\n${url}\n\nIf you did not ask for this, you can ignore this email - your password stays the same.`,
    html: layout(
      'Reset your password',
      p(`Hi ${esc(name)},`) +
        p(`Use the button below to choose a new password. The link is valid for ${ttlMinutes} minutes.`) +
        p('If you did not ask for this, you can ignore this email - your password stays the same.'),
      { label: 'Choose a new password', url },
    ),
  };
}

export interface AppointmentMailInfo {
  patientName: string;
  title: string;
  hospitalName: string;
  doctorName: string;
  when: string; // already formatted, e.g. "Thu, 1 Oct 2026, 10:00"
  url: string;
}

const details = (a: AppointmentMailInfo) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;font-size:14px">
<tr><td style="padding:2px 16px 2px 0;color:#64748b">Appointment</td><td>${esc(a.title)}</td></tr>
<tr><td style="padding:2px 16px 2px 0;color:#64748b">Hospital</td><td>${esc(a.hospitalName)}</td></tr>
<tr><td style="padding:2px 16px 2px 0;color:#64748b">Doctor</td><td>${esc(a.doctorName)}</td></tr>
<tr><td style="padding:2px 16px 2px 0;color:#64748b">When</td><td>${esc(a.when)}</td></tr></table>`;

const detailsText = (a: AppointmentMailInfo) =>
  `Appointment: ${a.title}\nHospital: ${a.hospitalName}\nDoctor: ${a.doctorName}\nWhen: ${a.when}`;

export function appointmentRequestedMail(a: AppointmentMailInfo): MailContent {
  return {
    subject: `Appointment request received - ${a.hospitalName}`,
    text: `Hi ${a.patientName},\n\nWe received the appointment request below. You will get another email once it is confirmed.\n\n${detailsText(a)}\n\n${a.url}`,
    html: layout(
      'We received your request',
      p(`Hi ${esc(a.patientName)}, your appointment request is waiting for confirmation. We will email you when it changes.`) + details(a),
      { label: 'View my appointments', url: a.url },
    ),
  };
}

export type MailableStatus = 'Confirmed' | 'Canceled' | 'Rejected';

export function appointmentStatusMail(a: AppointmentMailInfo, status: MailableStatus): MailContent {
  const copy = {
    Confirmed: { subject: 'Appointment confirmed', headline: 'Your appointment is confirmed', line: 'Please arrive a few minutes early.' },
    Canceled: { subject: 'Appointment canceled', headline: 'Your appointment was canceled', line: 'You can book another time any time.' },
    Rejected: { subject: 'Appointment declined', headline: 'Your appointment was declined', line: 'The hospital could not accept this time. Please try another slot.' },
  }[status];
  return {
    subject: `${copy.subject} - ${a.hospitalName}`,
    text: `Hi ${a.patientName},\n\n${copy.headline}.\n\n${detailsText(a)}\n\n${copy.line}\n${a.url}`,
    html: layout(copy.headline, p(`Hi ${esc(a.patientName)},`) + details(a) + p(esc(copy.line)), {
      label: 'View my appointments',
      url: a.url,
    }),
  };
}

export function appointmentReminderMail(a: AppointmentMailInfo): MailContent {
  return {
    subject: `Reminder: appointment at ${a.hospitalName}`,
    text: `Hi ${a.patientName},\n\nThis is a reminder of your upcoming appointment.\n\n${detailsText(a)}\n\n${a.url}`,
    html: layout('Appointment reminder', p(`Hi ${esc(a.patientName)}, this is a reminder of your upcoming appointment.`) + details(a), {
      label: 'View my appointments',
      url: a.url,
    }),
  };
}

export function contactReceivedMail(email: string, message: string): MailContent {
  return {
    subject: 'New Care Finder contact message',
    text: `From: ${email}\n\n${message}`,
    html: layout(
      'New contact message',
      p(`<strong>From:</strong> ${esc(email)}`) + `<p style="white-space:pre-wrap;line-height:1.6">${esc(message)}</p>`,
    ),
  };
}

export function organizationInviteMail(info: {
  inviterName: string;
  organizationName: string;
  role: string;
  url: string;
  validDays: number;
}): MailContent {
  return {
    subject: `${info.inviterName} invited you to ${info.organizationName} on Care Finder`,
    text: `${info.inviterName} invited you to join ${info.organizationName} on Care Finder as ${info.role}.\n\nAccept the invitation (valid for ${info.validDays} days):\n${info.url}\n\nSign in with the email address this message was sent to. If you were not expecting this, ignore it.`,
    html: layout(
      `Join ${info.organizationName}`,
      p(`${esc(info.inviterName)} invited you to join <strong>${esc(info.organizationName)}</strong> on Care Finder as <strong>${esc(info.role)}</strong>.`) +
        p(`The invitation is valid for ${info.validDays} days. Sign in with the email address this message was sent to.`) +
        p('If you were not expecting this, you can ignore this email.'),
      { label: 'Accept invitation', url: info.url },
    ),
  };
}
