import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;
let initialized = false;

function getTransporter(): nodemailer.Transporter | null {
  if (!initialized) {
    initialized = true;
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASS;
    if (user && pass) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
      console.log(`Mailer configured for ${user}`);
    } else {
      console.log('Mailer: No GMAIL_USER/GMAIL_APP_PASS — emails will be logged to console');
    }
  }
  return transporter;
}

export interface SendMailOpts {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(opts: SendMailOpts): Promise<void> {
  const t = getTransporter();
  const gmailUser = process.env.GMAIL_USER;
  if (t && gmailUser) {
    await t.sendMail({
      from: `"Rackd Coffee" <${gmailUser}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    console.log(`Email sent to ${opts.to}: ${opts.subject}`);
  } else {
    // Fallback: console log
    console.log('\n=== EMAIL (console fallback) ===');
    console.log(`To: ${opts.to}`);
    console.log(`Subject: ${opts.subject}`);
    console.log(`Body: ${opts.text}`);
    console.log('================================\n');
  }
}

// ── Specific email templates ────────────────────────────────────────

export async function sendInviteEmail(
  to: string,
  code: string,
  inviterName: string,
  role: string
): Promise<void> {
  await sendMail({
    to,
    subject: `You're invited to Rackd Coffee`,
    text: [
      `Hi,`,
      ``,
      `${inviterName} has invited you to join Rackd Coffee as a ${role}.`,
      ``,
      `Your invite code: ${code}`,
      ``,
      `Go to the accept invite page, enter your email and this code, then set your password.`,
      `This code expires in 48 hours.`,
      ``,
      `— Rackd Coffee`,
    ].join('\n'),
    html: `
      <div style="font-family: sans-serif; max-width: 400px;">
        <p>Hi,</p>
        <p><strong>${inviterName}</strong> has invited you to join Rackd Coffee as a <strong>${role}</strong>.</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: bold; margin: 24px 0; text-align: center;">${code}</p>
        <p>Go to the accept invite page, enter your email and this code, then set your password.</p>
        <p style="color: #666; font-size: 13px;">This code expires in 48 hours.</p>
      </div>
    `,
  });
}

export async function sendLoginOtpEmail(to: string, code: string): Promise<void> {
  await sendMail({
    to,
    subject: `Rackd Coffee — Login Code`,
    text: [
      `Your login code is: ${code}`,
      ``,
      `This code expires in 15 minutes.`,
      `If you didn't request this, ignore this email.`,
    ].join('\n'),
    html: `
      <div style="font-family: sans-serif; max-width: 400px;">
        <p>Your login code is:</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: bold; margin: 24px 0; text-align: center;">${code}</p>
        <p style="color: #666; font-size: 13px;">This code expires in 15 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
