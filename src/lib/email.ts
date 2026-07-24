import nodemailer from "nodemailer";

type SendResult = { sent: boolean; skipped?: boolean };

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
}

function appUrl() {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

async function send(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  const transport = getTransport();
  if (!transport) {
    console.warn(
      `[email] SMTP not configured — skipping email to ${to}. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS to enable.`
    );
    return { sent: false, skipped: true };
  }

  const from = process.env.EMAIL_FROM ?? "Ajaia Docs <no-reply@ajaia.dev>";
  await transport.sendMail({ from, to, subject, html, text });
  return { sent: true };
}

function layout(inner: string) {
  // Email-safe markup: table-based logo lockup with line-height centering (flexbox is
  // unsupported in Outlook). A solid white badge with a brand-indigo "A" renders crisply
  // everywhere and degrades to a square where border-radius is ignored (older Outlook).
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;padding:24px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
      <div style="background:#6d28d9;background:linear-gradient(135deg,#6366f1,#7c3aed);padding:28px 24px;text-align:center;">
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="width:48px;height:48px;background:#ffffff;border-radius:12px;text-align:center;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;color:#6d28d9;line-height:48px;">A</td>
          </tr>
        </table>
        <div style="color:#ffffff;font-size:18px;font-weight:bold;margin-top:12px;letter-spacing:.3px;">Ajaia Docs</div>
      </div>
      <div style="padding:28px 28px 32px;color:#27272a;font-size:15px;line-height:1.6;">${inner}</div>
    </div>
  </body></html>`;
}

function button(url: string, label: string) {
  return `<a href="${url}" style="display:inline-block;background:linear-gradient(90deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:10px;">${label}</a>`;
}

type Permission = "VIEW" | "COMMENT" | "EDIT";

function permissionVerb(permission: Permission) {
  if (permission === "EDIT") return "edit";
  if (permission === "COMMENT") return "comment on";
  return "view";
}

export async function sendShareInviteEmail(opts: {
  to: string;
  inviterName: string;
  documentTitle: string;
  permission: Permission;
  token: string;
}): Promise<SendResult> {
  const url = `${appUrl()}/signup?invite=${encodeURIComponent(opts.token)}&email=${encodeURIComponent(opts.to)}`;
  const verb = permissionVerb(opts.permission);
  const subject = `${opts.inviterName} invited you to ${opts.documentTitle}`;
  const html = layout(
    `<p style="margin:0 0 12px;"><strong>${opts.inviterName}</strong> invited you to ${verb} the document <strong>${opts.documentTitle}</strong> on Ajaia Docs.</p>
     <p style="margin:0 0 24px;color:#52525b;">Create your free account with this email address and the document will be waiting for you.</p>
     <p style="margin:0 0 8px;">${button(url, "Accept invitation")}</p>
     <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;">If you weren't expecting this, you can safely ignore this email.</p>`
  );
  const text = `${opts.inviterName} invited you to ${verb} "${opts.documentTitle}" on Ajaia Docs.\n\nAccept the invitation: ${url}`;
  return send(opts.to, subject, html, text);
}

export async function sendShareNotificationEmail(opts: {
  to: string;
  inviterName: string;
  documentTitle: string;
  permission: Permission;
  documentId: string;
}): Promise<SendResult> {
  const url = `${appUrl()}/documents/${opts.documentId}`;
  const verb = permissionVerb(opts.permission);
  const subject = `${opts.inviterName} shared ${opts.documentTitle} with you`;
  const html = layout(
    `<p style="margin:0 0 12px;"><strong>${opts.inviterName}</strong> shared the document <strong>${opts.documentTitle}</strong> with you. You can now ${verb} it.</p>
     <p style="margin:16px 0 8px;">${button(url, "Open document")}</p>`
  );
  const text = `${opts.inviterName} shared "${opts.documentTitle}" with you.\n\nOpen it: ${url}`;
  return send(opts.to, subject, html, text);
}
