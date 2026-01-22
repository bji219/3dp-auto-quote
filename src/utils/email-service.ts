import nodemailer from 'nodemailer';

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
  if (EMAIL_CONFIG.RESEND_API_KEY && EMAIL_CONFIG.RESEND_API_KEY !== 're_xxxxxxxxxx') return 'resend';
  if (EMAIL_CONFIG.SENDGRID_API_KEY && EMAIL_CONFIG.SENDGRID_API_KEY !== 'SG.xxxxxxxxxx') return 'sendgrid';
  return 'smtp';
}

/**
 * Initialize Resend client lazily
 */
let resendClient: any = null;

async function getResendClient(): Promise<any> {
  if (!resendClient && EMAIL_CONFIG.RESEND_API_KEY) {
    const { Resend } = await import('resend');
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
    const resend = await getResendClient();

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
 * Note: SendGrid package not installed. Install @sendgrid/mail to use this service.
 */
async function sendVerificationEmailViaSendGrid(
  email: string,
  code: string,
  expiresInMinutes: number = 15
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return {
    success: false,
    error: 'SendGrid is not configured. Install @sendgrid/mail package to use this service.',
  };
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
    const transporter = nodemailer.createTransport({
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
        const resend = await getResendClient();
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
        throw new Error('SendGrid is not configured');
      }
      case 'smtp': {
        const transporter = nodemailer.createTransport({
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

/**
 * Send quote email to customer with Order Now link
 */
export async function sendQuoteEmail(email: string, quoteData: {
  quoteId: string;
  fileName: string;
  material: string;
  quality: string;
  totalCost: number;
  validUntil: Date;
  breakdown: {
    estimatedPrice: number;
    shippingCost: number;
    rushOrderFee: number;
    discount: number;
    taxAmount: number;
  };
}): Promise<{ success: boolean; error?: string }> {
  const service = getEmailService();
  const orderUrl = `${EMAIL_CONFIG.APP_URL}/order/${quoteData.quoteId}`;
  const validDate = quoteData.validUntil.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your 3D Print Quote</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #1a1f26; margin: 0;">Your 3D Print Quote</h1>
      <p style="color: #666; margin-top: 10px;">Thank you for using IDW3D!</p>
    </div>

    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h3 style="margin-top: 0; color: #333;">Quote Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">File:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${quoteData.fileName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Material:</td>
          <td style="padding: 8px 0; text-align: right;">${quoteData.material}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Quality:</td>
          <td style="padding: 8px 0; text-align: right;">${quoteData.quality}</td>
        </tr>
      </table>
    </div>

    <div style="background: #e8f4fd; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
      <p style="margin: 0; color: #666; font-size: 14px;">Total Price</p>
      <p style="margin: 10px 0 0 0; font-size: 36px; font-weight: bold; color: #2563eb;">$${quoteData.totalCost.toFixed(2)}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${orderUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Order Now</a>
    </div>

    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
      <p style="color: #666; font-size: 14px; text-align: center;">
        <strong>Quote valid until:</strong> ${validDate}
      </p>
      <p style="color: #999; font-size: 12px; text-align: center;">
        Quote ID: ${quoteData.quoteId}
      </p>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        Questions? Reply to this email or contact us at support@idw3d.com
      </p>
      <p style="color: #999; font-size: 11px; margin-top: 10px;">
        IDW3D - Quality 3D Printing Services
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Your 3D Print Quote

Thank you for using IDW3D!

Quote Details:
- File: ${quoteData.fileName}
- Material: ${quoteData.material}
- Quality: ${quoteData.quality}
- Total Price: $${quoteData.totalCost.toFixed(2)}

Order Now: ${orderUrl}

Quote valid until: ${validDate}
Quote ID: ${quoteData.quoteId}

Questions? Contact us at support@idw3d.com

IDW3D - Quality 3D Printing Services
  `.trim();

  try {
    switch (service) {
      case 'resend': {
        const resend = await getResendClient();
        const { error } = await resend.emails.send({
          from: `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
          to: email,
          subject: `Your 3D Print Quote - $${quoteData.totalCost.toFixed(2)}`,
          html,
          text,
        });
        if (error) throw error;
        break;
      }
      case 'smtp': {
        const transporter = nodemailer.createTransport({
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
          subject: `Your 3D Print Quote - $${quoteData.totalCost.toFixed(2)}`,
          text,
          html,
        });
        break;
      }
      default:
        throw new Error('No email service configured');
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to send quote email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send order confirmation email to customer
 */
export async function sendOrderConfirmationEmail(email: string, orderData: {
  quoteId: string;
  fileName: string;
  material: string;
  quality: string;
  totalCost: number;
  validUntil: Date;
}): Promise<{ success: boolean; error?: string }> {
  const service = getEmailService();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #10b981; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 30px;">✓</span>
      </div>
      <h1 style="color: #10b981; margin: 0;">Order Confirmed!</h1>
      <p style="color: #666; margin-top: 10px;">Thank you for your order with IDW3D</p>
    </div>

    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h3 style="margin-top: 0; color: #166534;">Order Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Order ID:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${orderData.quoteId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">File:</td>
          <td style="padding: 8px 0; text-align: right;">${orderData.fileName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Material:</td>
          <td style="padding: 8px 0; text-align: right;">${orderData.material}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Quality:</td>
          <td style="padding: 8px 0; text-align: right;">${orderData.quality}</td>
        </tr>
        <tr style="border-top: 1px solid #86efac;">
          <td style="padding: 12px 0; color: #166534; font-weight: bold;">Total:</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 20px; color: #166534;">$${orderData.totalCost.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>What's Next?</strong><br>
        We'll review your order and begin printing shortly. You'll receive an email when your print is ready for shipping.
      </p>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        Questions about your order? Reply to this email or contact support@idw3d.com
      </p>
      <p style="color: #999; font-size: 11px; margin-top: 10px;">
        IDW3D - Quality 3D Printing Services
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Order Confirmed!

Thank you for your order with IDW3D.

Order Details:
- Order ID: ${orderData.quoteId}
- File: ${orderData.fileName}
- Material: ${orderData.material}
- Quality: ${orderData.quality}
- Total: $${orderData.totalCost.toFixed(2)}

What's Next?
We'll review your order and begin printing shortly. You'll receive an email when your print is ready for shipping.

Questions? Contact support@idw3d.com

IDW3D - Quality 3D Printing Services
  `.trim();

  try {
    switch (service) {
      case 'resend': {
        const resend = await getResendClient();
        const { error } = await resend.emails.send({
          from: `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
          to: email,
          subject: 'Order Confirmed - IDW3D',
          html,
          text,
        });
        if (error) throw error;
        break;
      }
      case 'smtp': {
        const transporter = nodemailer.createTransport({
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
          subject: 'Order Confirmed - IDW3D',
          text,
          html,
        });
        break;
      }
      default:
        throw new Error('No email service configured');
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send order notification to admin (you)
 */
export async function sendAdminOrderNotification(orderData: {
  quoteId: string;
  customerEmail: string;
  fileName: string;
  fileId?: string;
  material: string;
  quality: string;
  infillPercentage: number;
  rushOrder: boolean;
  totalCost: number;
  volume: number;
  boundingBox: string;
}): Promise<{ success: boolean; error?: string }> {
  const service = getEmailService();
  const adminEmail = process.env.ADMIN_EMAIL || 'intelligentdesignworkslimited@gmail.com';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order Received</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1a1f26; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; color: #00d9ff;">New Order Received!</h1>
  </div>

  <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
    <div style="background: #f0f9ff; border-left: 4px solid #00d9ff; padding: 15px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 18px;"><strong>Order Total: $${orderData.totalCost.toFixed(2)}</strong></p>
      <p style="margin: 5px 0 0 0; color: #666;">Quote ID: ${orderData.quoteId}</p>
    </div>

    <h3 style="color: #333; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Customer Details</h3>
    <p><strong>Email:</strong> ${orderData.customerEmail}</p>

    <h3 style="color: #333; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Print Specifications</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #666;">File Name:</td>
        <td style="padding: 8px 0;"><strong>${orderData.fileName}</strong></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">File ID:</td>
        <td style="padding: 8px 0;">${orderData.fileId || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Material:</td>
        <td style="padding: 8px 0;">${orderData.material}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Quality:</td>
        <td style="padding: 8px 0;">${orderData.quality}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Infill:</td>
        <td style="padding: 8px 0;">${orderData.infillPercentage}%</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Volume:</td>
        <td style="padding: 8px 0;">${orderData.volume.toFixed(2)} cm³</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Dimensions:</td>
        <td style="padding: 8px 0;">${orderData.boundingBox}</td>
      </tr>
      ${orderData.rushOrder ? '<tr><td style="padding: 8px 0; color: #f59e0b;">Rush Order:</td><td style="padding: 8px 0; color: #f59e0b; font-weight: bold;">YES</td></tr>' : ''}
    </table>

    <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin-top: 20px;">
      <p style="margin: 0; color: #92400e;">
        <strong>Action Required:</strong> Download the STL file from your Supabase database (FileUpload table) using the File ID above, then begin printing.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
NEW ORDER RECEIVED!

Order Total: $${orderData.totalCost.toFixed(2)}
Quote ID: ${orderData.quoteId}

CUSTOMER DETAILS
Email: ${orderData.customerEmail}

PRINT SPECIFICATIONS
File Name: ${orderData.fileName}
File ID: ${orderData.fileId || 'N/A'}
Material: ${orderData.material}
Quality: ${orderData.quality}
Infill: ${orderData.infillPercentage}%
Volume: ${orderData.volume.toFixed(2)} cm³
Dimensions: ${orderData.boundingBox}
${orderData.rushOrder ? 'RUSH ORDER: YES' : ''}

ACTION REQUIRED: Download the STL file from your Supabase database (FileUpload table) using the File ID above, then begin printing.
  `.trim();

  try {
    switch (service) {
      case 'resend': {
        const resend = await getResendClient();
        const { error } = await resend.emails.send({
          from: `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
          to: adminEmail,
          subject: `New Order: $${orderData.totalCost.toFixed(2)} - ${orderData.fileName}`,
          html,
          text,
        });
        if (error) throw error;
        break;
      }
      case 'smtp': {
        const transporter = nodemailer.createTransport({
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
          to: adminEmail,
          subject: `New Order: $${orderData.totalCost.toFixed(2)} - ${orderData.fileName}`,
          text,
          html,
        });
        break;
      }
      default:
        throw new Error('No email service configured');
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
