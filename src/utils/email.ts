import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Create nodemailer transporter
 */
function createTransporter() {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

/**
 * Send email using nodemailer
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string
): Promise<void> {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #0ea5e9;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Verify Your Email Address</h2>
          <p>Thank you for requesting a quote for your 3D printing project!</p>
          <p>Please verify your email address to receive your quote:</p>
          <a href="${verificationUrl}" class="button">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <div class="footer">
            <p>If you didn't request this quote, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Verify Your Email Address

    Thank you for requesting a quote for your 3D printing project!

    Please verify your email address by clicking the link below:
    ${verificationUrl}

    This link will expire in 24 hours.

    If you didn't request this quote, you can safely ignore this email.
  `;

  await sendEmail({
    to: email,
    subject: '3D Print Quote - Verify Your Email',
    html,
    text,
  });
}

/**
 * Send quote email
 */
export async function sendQuoteEmail(
  email: string,
  quoteDetails: {
    fileName: string;
    totalCost: number;
    estimatedPrintTime: number;
    validUntil: Date;
  }
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .quote-details {
            background-color: #f3f4f6;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .total {
            font-size: 20px;
            font-weight: bold;
            color: #0ea5e9;
            margin-top: 10px;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Your 3D Printing Quote</h2>
          <p>Thank you for your interest! Here's your quote:</p>

          <div class="quote-details">
            <div class="detail-row">
              <span>File:</span>
              <strong>${quoteDetails.fileName}</strong>
            </div>
            <div class="detail-row">
              <span>Estimated Print Time:</span>
              <strong>${quoteDetails.estimatedPrintTime.toFixed(1)} hours</strong>
            </div>
            <div class="detail-row">
              <span>Quote Valid Until:</span>
              <strong>${quoteDetails.validUntil.toLocaleDateString()}</strong>
            </div>
            <div class="detail-row total">
              <span>Total Cost:</span>
              <span>$${quoteDetails.totalCost.toFixed(2)}</span>
            </div>
          </div>

          <p>This quote is valid for 7 days. If you have any questions, please don't hesitate to contact us.</p>

          <div class="footer">
            <p>Thank you for choosing our 3D printing service!</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Your 3D Printing Quote

    Thank you for your interest! Here's your quote:

    File: ${quoteDetails.fileName}
    Estimated Print Time: ${quoteDetails.estimatedPrintTime.toFixed(1)} hours
    Quote Valid Until: ${quoteDetails.validUntil.toLocaleDateString()}

    Total Cost: $${quoteDetails.totalCost.toFixed(2)}

    This quote is valid for 7 days. If you have any questions, please don't hesitate to contact us.
  `;

  await sendEmail({
    to: email,
    subject: 'Your 3D Printing Quote',
    html,
    text,
  });
}
