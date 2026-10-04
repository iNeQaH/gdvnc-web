import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

function env(name: string): string {
  return (process.env[name] || '').trim();
}

/** Strip BOM, wrapping quotes, and `"Name" <addr@host>` so Gmail auth gets a bare address. */
function cleanEnv(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
}

function emailFromEnv(value: string): string {
  const cleaned = cleanEnv(value);
  const angled = cleaned.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  if (angled) return angled[1].trim().toLowerCase();
  return cleaned;
}

function smtpUser(): string {
  return emailFromEnv(env('SMTP_USER'));
}

function smtpPass(): string {
  return cleanEnv(env('SMTP_PASS')).replace(/\s+/g, '');
}

function resendApiKey(): string {
  return cleanEnv(env('RESEND_API_KEY'));
}

function resendFrom(): string {
  return cleanEnv(env('RESEND_FROM')) || cleanEnv(env('SMTP_FROM')) || 'GDVN <onboarding@resend.dev>';
}

export function isMailConfigured(): boolean {
  if (cleanEnv(env('MAIL_MOCK')).toLowerCase() === 'true' || cleanEnv(env('MAIL_PROVIDER')).toLowerCase() === 'mock') {
    return true;
  }
  return Boolean(resendApiKey() || (smtpUser() && smtpPass()));
}

async function sendViaResend(fields: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const apiKey = resendApiKey();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured in .env');
  }

  const from = resendFrom();
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [fields.to],
      subject: fields.subject,
      text: fields.text,
      html: fields.html,
    }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    const msg = errorJson?.message || `Resend API returned HTTP ${res.status}`;
    console.error('Resend email error:', errorJson || msg);
    throw new Error(`Resend error: ${msg}`);
  }
}

function isGmailAddress(user: string): boolean {
  const host = user.split('@')[1]?.toLowerCase() || '';
  return host === 'gmail.com' || host === 'googlemail.com';
}

function gmailTransportOptions(user: string, pass: string, port: 465 | 587): SMTPTransport.Options {
  return {
    host: 'smtp.gmail.com',
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    tls: { minVersion: 'TLSv1.2' },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  };
}

function createTransporter(port?: 465 | 587) {
  const user = smtpUser();
  const pass = smtpPass();

  if (isGmailAddress(user)) {
    return nodemailer.createTransport(gmailTransportOptions(user, pass, port ?? 465));
  }

  const host = cleanEnv(env('SMTP_HOST')) || 'smtp.gmail.com';
  const parsed = parseInt(env('SMTP_PORT') || '587', 10);
  const smtpPort = Number.isFinite(parsed) ? parsed : 587;
  return nodemailer.createTransport({
    host,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user, pass },
    tls: { minVersion: 'TLSv1.2' },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
}

function isAuthFailure(error: unknown): boolean {
  const raw = String((error as { response?: string; message?: string })?.response
    || (error as { message?: string })?.message
    || '');
  const code = String((error as { code?: string })?.code || '');
  return (
    code === 'EAUTH'
    || /535|534|BadCredentials|Username and Password not accepted|Application-specific password/i.test(raw)
  );
}

function isConnectFailure(error: unknown): boolean {
  const code = String((error as { code?: string })?.code || '');
  const raw = String((error as { message?: string })?.message || '');
  return /ETIMEDOUT|ECONNECTION|ESOCKET|ECONNRESET|ENOTFOUND/i.test(`${code} ${raw}`);
}

function mapSendError(error: unknown, locale: 'vi' | 'en'): Error {
  const raw = String((error as { response?: string; message?: string })?.response
    || (error as { message?: string })?.message
    || '');
  const needAppPassword = /534|Application-specific password/i.test(raw);
  if (needAppPassword || isAuthFailure(error)) {
    return new Error(
      locale === 'en'
        ? 'Gmail rejected the login. SMTP_USER must be the Gmail address shown at the top of myaccount.google.com. SMTP_PASS must be a 16-character App Password (Google Account → Security → 2-Step Verification → App passwords), not the normal Gmail password and not the GDVN username.'
        : 'Gmail từ chối đăng nhập. SMTP_USER phải là đúng địa chỉ Gmail trên cùng trang myaccount.google.com. SMTP_PASS phải là Mật khẩu ứng dụng 16 ký tự (Tài khoản Google → Bảo mật → Xác minh 2 bước → Mật khẩu ứng dụng), không phải mật khẩu Gmail thường và không phải username GDVN.'
    );
  }
  return error instanceof Error ? error : new Error(raw || 'SMTP error');
}

function fromHeader(user: string): string {
  const from = cleanEnv(env('SMTP_FROM'));
  if (from) return from;
  return `"GDVN" <${user}>`;
}

async function sendViaConfiguredTransport(fields: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const provider = cleanEnv(env('MAIL_PROVIDER')).toLowerCase();

  // 1. Mock mode
  if (cleanEnv(env('MAIL_MOCK')).toLowerCase() === 'true' || provider === 'mock') {
    console.log(`[GDVN MAIL MOCK] ----------------------------------------`);
    console.log(`To: ${fields.to}`);
    console.log(`Subject: ${fields.subject}`);
    console.log(`Content:\n${fields.text}`);
    console.log(`--------------------------------------------------------`);
    return;
  }

  // 2. Resend API mode (priority if key exists and provider is not forced to smtp)
  if (provider === 'resend' || (resendApiKey() && provider !== 'smtp')) {
    await sendViaResend(fields);
    return;
  }

  // 3. SMTP fallback
  const user = smtpUser();
  if (!user.includes('@')) {
    throw new Error(`SMTP_USER must be a full email address, not "${user || env('SMTP_USER')}". Or configure RESEND_API_KEY.`);
  }

  const trySend = async (port?: 465 | 587) => {
    const transporter = createTransporter(port);
    await transporter.sendMail({
      from: fromHeader(user),
      envelope: { from: user, to: fields.to },
      to: fields.to,
      subject: fields.subject,
      text: fields.text,
      html: fields.html,
    });
  };

  try {
    await trySend(isGmailAddress(user) ? 465 : undefined);
  } catch (first) {
    if (isGmailAddress(user) && isConnectFailure(first)) {
      await trySend(587);
      return;
    }
    throw first;
  }
}

export async function sendOtpEmail(to: string, code: string, locale: 'vi' | 'en' = 'vi') {
  if (!isMailConfigured()) {
    throw new Error(
      locale === 'en'
        ? 'Email sending is not configured. Set RESEND_API_KEY or SMTP_USER/SMTP_PASS in .env'
        : 'Hệ thống gửi email chưa được cấu hình. Hãy điền RESEND_API_KEY hoặc SMTP_USER/SMTP_PASS trong file .env'
    );
  }

  const isEn = locale === 'en';
  const subject = isEn ? `${code} - GDVN verification code` : `${code} - Mã xác nhận đăng ký GDVN`;
  const text = isEn
    ? `Your GDVN verification code is: ${code} (valid for 10 minutes).`
    : `Mã xác thực đăng ký GDVN của bạn là: ${code} (có hiệu lực 10 phút).`;

  try {
    await sendViaConfiguredTransport({
      to,
      subject,
      text,
      html: otpHtml(
        isEn ? 'Verify Email' : 'Xác thực tài khoản',
        code,
        isEn ? 'Valid for 10 minutes.' : 'Mã có hiệu lực trong 10 phút.'
      ),
    });
  } catch (error: unknown) {
    console.error('Mail sending error:', error);
    throw mapSendError(error, locale);
  }
}

export async function sendResetPasswordEmail(to: string, code: string, locale: 'vi' | 'en' = 'vi') {
  if (!isMailConfigured()) {
    throw new Error(
      locale === 'en'
        ? 'Email sending is not configured. Set RESEND_API_KEY or SMTP_USER/SMTP_PASS in .env'
        : 'Hệ thống gửi email chưa được cấu hình. Hãy điền RESEND_API_KEY hoặc SMTP_USER/SMTP_PASS trong file .env'
    );
  }

  const isEn = locale === 'en';
  const subject = isEn ? `${code} - GDVN password reset code` : `${code} - Mã đặt lại mật khẩu GDVN`;
  const text = isEn
    ? `Your GDVN password reset code is: ${code} (valid for 10 minutes).`
    : `Mã đặt lại mật khẩu GDVN của bạn là: ${code} (có hiệu lực 10 phút).`;

  try {
    await sendViaConfiguredTransport({
      to,
      subject,
      text,
      html: otpHtml(
        isEn ? 'Reset Password' : 'Đặt lại mật khẩu',
        code,
        isEn ? 'Valid for 10 minutes.' : 'Mã có hiệu lực trong 10 phút.'
      ),
    });
  } catch (error: unknown) {
    console.error('Mail sending error:', error);
    throw mapSendError(error, locale);
  }
}

function otpHtml(title: string, code: string, expire: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:32px 16px;background:#0f172a;text-align:center;">
      <div style="max-width:400px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px 24px;border:1px solid #334155;color:#f8fafc;">
        <div style="font-size:18px;font-weight:700;color:#38bdf8;margin-bottom:6px;letter-spacing:1px;">GDVN</div>
        <div style="font-size:13px;color:#94a3b8;margin-bottom:20px;">${title}</div>
        <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#0f172a;color:#38bdf8;padding:16px 20px;border-radius:12px;border:1px solid #0284c7;display:inline-block;margin-bottom:18px;">
          ${code}
        </div>
        <div style="font-size:12px;color:#64748b;">${expire}</div>
      </div>
    </div>
  `;
}
