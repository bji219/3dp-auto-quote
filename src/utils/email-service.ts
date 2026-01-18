import { Resend } from 'resend';

/**
 * Email service configuration
 */
export const EMAIL_CONFIG = {
  FROM_EMAIL: process.env.EMAIL_FROM || 'noreply@3dpquote.com',
  FROM_NAME: process.env.EMAIL_FROM_NAME || '3D Print Quote',
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};

/**
 * Email service type
 */
type EmailService = 'resend' | 'sendgrid' | 'smtp';

/**
 * Get the configured email service
 */
function getEmailService(): EmailService {
  if (EMAIL_CONFIG.RESEND_API_KEY) return 'resend';
  if (EMAIL_CONFIG.SENDGRID_API_KEY) return 'sendgrid';
  return 'smtp';
}

/**
 * Initialize Resend client
 */
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient && EMAIL_CONFIG.RESEND_API_KEY) {
    resendClient = new Resend(EMAIL_CONFIG.RESEND_API_KEY);
  }
  if (!resendClient) {
    throw new Error('Resend API key not configured');
  }
  return resendClient;
}

/**
 * Send verification code email using Resend
 */
async function sendVerificationEmailViaResend(
  email: string,
  code: string,
  expiresInMinutes: number = 15
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
      to: email,
      subject: `Your verification code: ${code}`,
      html: getVerificationEmailHTML(code, expiresInMinutes),
      text: getVerificationEmailText(code, expiresInMinutes),
    });

    if (error) {
      console.error('Resend email error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send verification code email using SendGrid
 */
async function sendVerificationEmailViaSendGrid(
  email: string,
  code: string,
  expiresInMinutes: number = 15
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // SendGrid implementation
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(EMAIL_CONFIG.SENDGRID_API_KEY);

    const msg = {
      to: email,
      from: {
        email: EMAIL_CONFIG.FROM_EMAIL,
        name: EMAIL_CONFIG.FROM_NAME,
      },
      subject: `Your verification code: ${code}`,
      text: getVerificationEmailText(code, expiresInMinutes),
      html: getVerificationEmailHTML(code, expiresInMinutes),
    };

    const response = await sgMail.send(msg);

    return {
      success: true,
      messageId: response[0].headers['x-message-id'],
    };
  } catch (error) {
    console.error('Failed to send email via SendGrid:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send verification code email using SMTP (fallback)
 */
async function sendVerificationEmailViaSMTP(
  email: string,
  code: string,
  expiresInMinutes: number = 15
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: `"${EMAIL_CONFIG.FROM_NAME}" <${EMAIL_CONFIG.FROM_EMAIL}>`,
      to: email,
      subject: `Your verification code: ${code}`,
      text: getVerificationEmailText(code, expiresInMinutes),
      html: getVerificationEmailHTML(code, expiresInMinutes),
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Failed to send email via SMTP:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main function to send verification code email
 */
export async function sendVerificationCodeEmail(
  email: string,
  code: string,
  expiresInMinutes: number = 15
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const service = getEmailService();

  switch (service) {
    case 'resend':
      return sendVerificationEmailViaResend(email, code, expiresInMinutes);
    case 'sendgrid':
      return sendVerificationEmailViaSendGrid(email, code, expiresInMinutes);
    case 'smtp':
      return sendVerificationEmailViaSMTP(email, code, expiresInMinutes);
    default:
      return {
        success: false,
        error: 'No email service configured',
      };
  }
}

/**
 * Generate verification email HTML
 */
function getVerificationEmailHTML(code: string, expiresInMinutes: number): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .code-container {
      background: #f5f5f5;
      border: 2px dashed #4f46e5;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
    }
    .code {
      font-size: 36px;
      font-weight: bold;
      color: #4f46e5;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Email Verification</h1>
      <p>Thank you for using our 3D printing quote service!</p>
    </div>

    <p>Your verification code is:</p>

    <div class="code-container">
      <div class="code">${code}</div>
    </div>

    <p>Enter this code in the verification form to continue with your quote request.</p>

    <div class="warning">
      <strong>⏰ This code will expire in ${expiresInMinutes} minutes.</strong>
    </div>

    <p>If you didn't request this code, you can safely ignore this email.</p>

    <div class="footer">
      <p>This is an automated message from 3D Print Quote.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate verification email plain text
 */
function getVerificationEmailText(code: string, expiresInMinutes: number): string {
  return `
Email Verification

Thank you for using our 3D printing quote service!

Your verification code is: ${code}

Enter this code in the verification form to continue with your quote request.

⏰ This code will expire in ${expiresInMinutes} minutes.

If you didn't request this code, you can safely ignore this email.

---
This is an automated message from 3D Print Quote.
Please do not reply to this email.
  `.trim();
}

/**
 * Send welcome email to new subscribers
 */
export async function sendWelcomeEmail(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const service = getEmailService();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #4f46e5;">Welcome to 3D Print Quote!</h1>
    <p>Thank you for verifying your email address.</p>
    <p>You'll now receive updates about your quotes and special offers for 3D printing services.</p>
    <p>If you have any questions, feel free to reach out to us.</p>
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center;">
      <p>3D Print Quote - Fast, accurate quotes for your 3D printing needs</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Welcome to 3D Print Quote!

Thank you for verifying your email address.

You'll now receive updates about your quotes and special offers for 3D printing services.

If you have any questions, feel free to reach out to us.

---
3D Print Quote - Fast, accurate quotes for your 3D printing needs
  `.trim();

  try {
    switch (service) {
      case 'resend': {
        const resend = getResendClient();
        const { error } = await resend.emails.send({
          from: `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
          to: email,
          subject: 'Welcome to 3D Print Quote!',
          html,
          text,
        });
        if (error) throw error;
        break;
      }
      case 'sendgrid': {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(EMAIL_CONFIG.SENDGRID_API_KEY);
        await sgMail.send({
          to: email,
          from: { email: EMAIL_CONFIG.FROM_EMAIL, name: EMAIL_CONFIG.FROM_NAME },
          subject: 'Welcome to 3D Print Quote!',
          text,
          html,
        });
        break;
      }
      case 'smtp': {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransporter({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
        await transporter.sendMail({
          from: `"${EMAIL_CONFIG.FROM_NAME}" <${EMAIL_CONFIG.FROM_EMAIL}>`,
          to: email,
          subject: 'Welcome to 3D Print Quote!',
          text,
          html,
        });
        break;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
