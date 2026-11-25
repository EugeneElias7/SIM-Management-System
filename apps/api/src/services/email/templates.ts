import type { ReminderType } from '@san/shared';

function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function layout(options: {
  preheader: string;
  eyebrow: string;
  heading: string;
  intro: string;
  content: string;
  ctaLabel?: string;
  ctaUrl?: string;
  appUrl: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#0b1f3b;padding:22px 32px;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="display:inline-block;background:#ffffff;color:#0b1f3b;font-weight:800;font-size:14px;padding:7px 10px;border-radius:8px;letter-spacing:1px;">SAN</span>
                    <span style="color:#ffffff;font-size:14px;font-weight:700;letter-spacing:1.2px;margin-left:10px;">SAN SOLUTION</span>
                  </td>
                  <td align="right" style="color:#94a3b8;font-size:11px;letter-spacing:1px;text-transform:uppercase;">SIM Management</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 12px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#2563eb;margin-bottom:10px;">${escapeHtml(options.eyebrow)}</div>
              <h1 style="margin:0 0 14px;font-size:24px;line-height:1.3;color:#0b1f3b;">${escapeHtml(options.heading)}</h1>
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.7;">${options.intro}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px;">
              ${options.content}
            </td>
          </tr>
          ${
            options.ctaUrl && options.ctaLabel
              ? `<tr>
            <td style="padding:12px 32px 32px;">
              <a href="${escapeHtml(options.ctaUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;">${escapeHtml(options.ctaLabel)}</a>
            </td>
          </tr>`
              : `<tr><td style="padding:0 32px 32px;"></td></tr>`
          }
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
              <p style="margin:0 0 6px;font-size:11px;line-height:1.6;color:#64748b;">This is an automated operational email from the SAN SOLUTION SIM Management System.</p>
              <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;">SAN SOLUTION · <a href="${escapeHtml(options.appUrl)}" style="color:#2563eb;text-decoration:none;">Open SIM Management</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface ExpiryEmailPayload {
  recipientName: string | null;
  companyName: string | null;
  simId: string;
  internalId: string;
  mobileNumber: string;
  provider: string;
  machineName: string | null;
  expiryDate: string;
  daysRemaining: number;
  reminderType: ReminderType;
  appUrl: string;
}

export function expiryReminderSubject(payload: ExpiryEmailPayload): string {
  const prefix = payload.companyName ? `${payload.companyName}: ` : '';
  if (payload.daysRemaining < 0) {
    return `${prefix}SIM ${payload.internalId} expired ${Math.abs(payload.daysRemaining)} day(s) ago`;
  }
  if (payload.daysRemaining === 0) {
    return `${prefix}SIM ${payload.internalId} expires today`;
  }
  return `${prefix}SIM ${payload.internalId} expires in ${payload.daysRemaining} day(s)`;
}

export function renderExpiryReminderEmail(payload: ExpiryEmailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = expiryReminderSubject(payload);
  const greeting = payload.recipientName ? `Hello ${escapeHtml(payload.recipientName)},` : 'Hello,';
  const timeliness =
    payload.daysRemaining < 0
      ? `This SIM expired ${Math.abs(payload.daysRemaining)} day(s) ago. Please renew it or confirm that the service is no longer required.`
      : payload.daysRemaining === 0
        ? 'This SIM expires today. Please renew it to avoid loss of connectivity for the associated machinery.'
        : `This SIM will expire in ${payload.daysRemaining} day(s). Please arrange renewal before the expiry date to avoid service interruption.`;

  const rows: Array<[string, string]> = [
    ['SIM ID', payload.internalId],
    ['Mobile number', payload.mobileNumber],
    ['Company', payload.companyName ?? 'Unassigned'],
    ['Machine', payload.machineName ?? 'Not linked'],
    ['Network', payload.provider],
    ['Expiry date', payload.expiryDate],
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eef2f7;font-size:12px;color:#64748b;width:38%;">${escapeHtml(label)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eef2f7;font-size:13px;color:#0f172a;font-weight:600;">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join('');

  const html = layout({
    preheader: `${payload.internalId} expires ${payload.expiryDate}`,
    eyebrow: payload.reminderType === 'POST_EXPIRY' ? 'Expired SIM follow-up' : 'SIM validity reminder',
    heading:
      payload.daysRemaining < 0
        ? 'A SIM requires immediate attention'
        : payload.daysRemaining === 0
          ? 'SIM expires today'
          : `SIM expires in ${payload.daysRemaining} days`,
    intro: greeting,
    content: `<p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#475569;">${timeliness}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:6px 18px;margin-bottom:20px;">
        ${rowsHtml}
      </table>
      <p style="margin:0;font-size:12px;line-height:1.7;color:#64748b;">Reminder generated by the automated expiry engine. Renewal history and assignment history are preserved in the system.</p>`,
    ctaLabel: 'Open SIM record',
    ctaUrl: `${payload.appUrl}/sims/${payload.simId}`,
    appUrl: payload.appUrl,
  });

  const text = [
    subject,
    '',
    payload.recipientName ? `Hello ${payload.recipientName},` : 'Hello,',
    '',
    timeliness,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Open the SIM record: ${payload.appUrl}/sims/${payload.simId}`,
    '',
    'This is an automated operational email from the SAN SOLUTION SIM Management System.',
  ].join('\n');

  return { subject, html, text };
}

export function renderPasswordResetEmail(payload: {
  recipientName: string;
  resetUrl: string;
  expiresInMinutes: number;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = 'Reset your SAN SOLUTION SIM Management password';
  const html = layout({
    preheader: 'Password reset instructions',
    eyebrow: 'Account security',
    heading: 'Reset your password',
    intro: `Hello ${escapeHtml(payload.recipientName)},<br /><br />We received a request to reset the password for your administrator account. This link is valid for ${payload.expiresInMinutes} minutes.`,
    content: `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #2563eb;border-radius:8px;padding:16px 18px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#0f172a;">If you requested this reset</p>
      <p style="margin:0;font-size:12px;line-height:1.7;color:#64748b;">Use the button below to set a new password. The link can only be used once.</p>
    </div>
    <p style="margin:18px 0 0;font-size:12px;line-height:1.7;color:#64748b;">If you did not request this email, no action is required. Your password has not been changed.</p>`,
    ctaLabel: 'Set a new password',
    ctaUrl: payload.resetUrl,
    appUrl: payload.appUrl,
  });
  const text = [
    subject,
    '',
    `Hello ${payload.recipientName},`,
    '',
    `A password reset was requested for your SAN SOLUTION SIM Management account. Use this link within ${payload.expiresInMinutes} minutes:`,
    payload.resetUrl,
    '',
    'If you did not request this email, no action is required.',
  ].join('\n');
  return { subject, html, text };
}

export function renderTestEmail(payload: { appUrl: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'SAN SOLUTION email configuration test';
  const html = layout({
    preheader: 'Your SMTP configuration is working',
    eyebrow: 'Email configuration',
    heading: 'Email delivery is working',
    intro: 'This test message confirms that the SIM Management System can connect to your configured SMTP server.',
    content: `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 18px;color:#166534;font-size:13px;line-height:1.7;">
      Expiry reminders, password reset emails, and operational notifications will be delivered using this configuration.
    </div>`,
    appUrl: payload.appUrl,
  });
  return {
    subject,
    html,
    text: `${subject}\n\nThis test message confirms that SMTP delivery is working for the SAN SOLUTION SIM Management System.`,
  };
}
