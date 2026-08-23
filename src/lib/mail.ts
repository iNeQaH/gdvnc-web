import nodemailer from 'nodemailer';

function env(name: string): string {
  return (process.env[name] || '').trim();
}

export function isMailConfigured(): boolean {
  return Boolean(env('SMTP_USER') && env('SMTP_PASS'));
}

function createTransporter() {
  const user = env('SMTP_USER');
  const pass = env('SMTP_PASS').replace(/\s+/g, '');

  // Gmail well-known service: full address + 16-char App Password
  if (user.toLowerCase().endsWith('@gmail.com') || user.toLowerCase().endsWith('@googlemail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  const host = env('SMTP_HOST') || 'smtp.gmail.com';
  const port = parseInt(env('SMTP_PORT') || '587', 10);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function mapSendError(error: any, locale: 'vi' | 'en'): Error {
  const raw = String(error?.response || error?.message || '');
  const badLogin = /535|BadCredentials|Username and Password not accepted/i.test(raw);
  if (badLogin) {
    return new Error(
      locale === 'en'
        ? 'Gmail rejected the login. SMTP_USER must be the exact Gmail that created the App Password (the address shown at the top of myaccount.google.com), not the GDVNC username.'
        : 'Gmail từ chối đăng nhập. SMTP_USER phải là đúng địa chỉ Gmail đang mở khi tạo Mật khẩu ứng dụng (email hiện trên cùng trang myaccount.google.com), không phải username GDVNC.'
    );
  }
  return error instanceof Error ? error : new Error(raw || 'SMTP error');
}

export async function sendOtpEmail(to: string, code: string, locale: 'vi' | 'en' = 'vi') {
  if (!isMailConfigured()) {
    throw new Error(
      locale === 'en'
        ? 'Email sending is not configured. Set SMTP_USER and SMTP_PASS in .env'
        : 'Hệ thống gửi email chưa được cấu hình. Hãy điền SMTP_USER và SMTP_PASS trong file .env'
    );
  }

  const user = env('SMTP_USER');
  if (!user.includes('@')) {
    throw new Error(
      locale === 'en'
        ? `SMTP_USER must be a full Gmail address, not "${user}".`
        : `SMTP_USER phải là địa chỉ Gmail đầy đủ, không phải "${user}".`
    );
  }

  const transporter = createTransporter();
  const from = env('SMTP_FROM') || `"GDVNC" <${user}>`;

  const isEn = locale === 'en';
  const subject = isEn
    ? 'GDVNC registration code'
    : 'Mã xác nhận đăng ký tài khoản GDVNC';
  const heading = isEn ? 'Verify your GDVNC email' : 'Xác thực email đăng ký GDVNC';
  const intro = isEn ? 'Your verification code is:' : 'Mã xác thực của bạn là:';
  const expire = isEn
    ? 'This code is valid for 10 minutes. If you did not request an account, please ignore this email.'
    : 'Mã này có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này.';

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text: `${intro} ${code}\n\n${expire}`,
      html: `
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
      `,
    });
  } catch (error: any) {
    throw mapSendError(error, locale);
  }
}
