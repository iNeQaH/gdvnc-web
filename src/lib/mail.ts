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

export function isMailConfigured(): boolean {
  return Boolean(smtpUser() && smtpPass());
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
  const user = smtpUser();
  if (!user.includes('@')) {
    throw new Error(`SMTP_USER must be a full email address, not "${user || env('SMTP_USER')}".`);
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
        ? 'Email sending is not configured. Set SMTP_USER and SMTP_PASS in .env'
        : 'Hệ thống gửi email chưa được cấu hình. Hãy điền SMTP_USER và SMTP_PASS trong file .env'
    );
  }

  const isEn = locale === 'en';
  const subject = isEn ? 'GDVN registration code' : 'Mã xác nhận đăng ký tài khoản GDVN';
  const heading = isEn ? 'Verify your GDVN email' : 'Xác thực email đăng ký GDVN';
  const intro = isEn ? 'Your verification code is:' : 'Mã xác thực của bạn là:';
  const expire = isEn
    ? 'This code is valid for 10 minutes. If you did not request an account, please ignore this email.'
    : 'Mã này có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này.';

  try {
    await sendViaConfiguredTransport({
      to,
      subject,
      text: `${intro} ${code}\n\n${expire}`,
      html: otpHtml(heading, intro, code, expire),
    });
  } catch (error: unknown) {
    console.error('SMTP sending error:', {
      user: smtpUser(),
      code: (error as { code?: string })?.code,
      message: (error as { message?: string })?.message,
    });
    throw mapSendError(error, locale);
  }
}

export async function sendResetPasswordEmail(to: string, code: string, locale: 'vi' | 'en' = 'vi') {
  if (!isMailConfigured()) {
    throw new Error(
      locale === 'en'
        ? 'Email sending is not configured. Set SMTP_USER and SMTP_PASS in .env'
        : 'Hệ thống gửi email chưa được cấu hình. Hãy điền SMTP_USER và SMTP_PASS trong file .env'
    );
  }

  const isEn = locale === 'en';
  const subject = isEn ? 'GDVN password reset code' : 'Mã đặt lại mật khẩu GDVN';
  const heading = isEn ? 'Reset your GDVN password' : 'Đặt lại mật khẩu GDVN';
  const intro = isEn ? 'Your password reset code is:' : 'Mã đặt lại mật khẩu của bạn là:';
  const expire = isEn
    ? 'This code is valid for 10 minutes. If you did not request a reset, please ignore this email.'
    : 'Mã này có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.';

  try {
    await sendViaConfiguredTransport({
      to,
      subject,
      text: `${intro} ${code}\n\n${expire}`,
      html: otpHtml(heading, intro, code, expire),
    });
  } catch (error: unknown) {
    console.error('SMTP sending error:', {
      user: smtpUser(),
      code: (error as { code?: string })?.code,
      message: (error as { message?: string })?.message,
    });
    throw mapSendError(error, locale);
  }
}

function otpHtml(heading: string, intro: string, code: string, expire: string): string {
  return `
        <div style="font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #1e293b; background: #f8fafc;">
          <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0;">
            <h2 style="margin: 0 0 12px; color: #0284c7;">${heading}</h2>
            <p style="margin: 0 0 16px; font-size: 14px;">${intro}</p>
            <div style="font-size: 28px; font-weight: 800; letter-spacing: 8px; background: #f0f9ff; color: #0369a1; padding: 14px 20px; border-radius: 12px; text-align: center;">
              ${code}
            </div>
            <p style="margin: 18px 0 0; font-size: 12px; color: #64748b;">${expire}</p>
          </div>
        </div>
      `;
}
