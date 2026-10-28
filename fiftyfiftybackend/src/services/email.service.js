import { BrevoClient } from '@getbrevo/brevo';

/**
 * Initializes the BrevoClient using BREVO_API_KEY from environment.
 * Returns null if the API key is not configured.
 */
export const getBrevoClient = () => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  if (!apiKey) {
    return null;
  }
  return new BrevoClient({ apiKey });
};

let customEmailDispatcher = null;

/**
 * Allows automated test suites to mock Brevo transactional dispatches
 * without sending real emails over the network.
 */
export const setEmailDispatcherForTest = (fn) => {
  customEmailDispatcher = fn;
};

/**
 * Reusable function for sending transactional emails via Brevo.
 */
export const sendEmail = async ({
  to,
  subject,
  htmlContent,
  textContent,
  recipientName = ''
}) => {
  if (!to || !to.trim()) {
    throw new Error('Recipient email is required.');
  }
  if (!subject || !subject.trim()) {
    throw new Error('Email subject is required.');
  }

  // Intercept if test mock is configured
  if (customEmailDispatcher) {
    return customEmailDispatcher({ to, subject, htmlContent, textContent, recipientName });
  }

  const client = getBrevoClient();
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim();
  const senderName = (process.env.BREVO_SENDER_NAME || 'FiftyFifty Gym').trim();

  // If credentials are unconfigured, log helpful server notice and return status
  if (!client || !senderEmail) {
    console.warn(`[Email Service Notice] Email "${subject}" to <${to}> was skipped: Brevo credentials not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL).`);
    return {
      success: false,
      status: 'unconfigured',
      message: 'Brevo credentials are not configured in environment.'
    };
  }

  try {
    const payload = {
      subject: subject.trim(),
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: to.trim().toLowerCase(),
          ...(recipientName ? { name: recipientName } : {})
        }
      ]
    };

    if (htmlContent) payload.htmlContent = htmlContent;
    if (textContent) payload.textContent = textContent;

    const response = await client.transactionalEmails.sendTransacEmail(payload);

    const messageId = response?.messageId || 'accepted';
    console.log(`[Email Service] Transactional email "${subject}" accepted by Brevo for <${to}> (messageId: ${messageId})`);

    return {
      success: true,
      messageId
    };
  } catch (error) {
    // Redact any sensitive parts from error log
    console.error(`[Email Service Error] Brevo API call failed for <${to}>:`, error?.message || error);
    return {
      success: false,
      error: error?.message || 'Brevo transactional email dispatch failed.'
    };
  }
};

/**
 * Generates branded FiftyFifty Gym HTML email for Super Admin password reset.
 */
export const renderPasswordResetHtml = ({ resetUrl, recipientName = 'Super Admin', expiryMinutes = 15 }) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your FiftyFifty Gym Admin Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header Bar -->
          <tr>
            <td style="padding: 28px 36px 20px; border-bottom: 1px solid #F1F5F9; text-align: left;">
              <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #111827;">
                <span style="color: #FF6B00;">FIFTYFIFTY</span> GYM
              </span>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 16px;">
                Reset Your FiftyFifty Gym Admin Password
              </h1>
              <p style="font-size: 15px; color: #4B5563; margin: 0 0 16px;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="font-size: 15px; color: #4B5563; margin: 0 0 24px;">
                We received a request to reset the password for your FiftyFifty Gym Super Admin account. Click the button below to create a new password:
              </p>
              <!-- Call to Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 28px;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #FF6B00;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
                      Reset Admin Password
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: #FFF7ED; border-left: 4px solid #FF6B00; padding: 12px 16px; border-radius: 6px; margin: 0 0 24px;">
                <p style="font-size: 13px; color: #9A3412; margin: 0; font-weight: 600;">
                  ⚠️ This reset link will expire in ${expiryMinutes} minutes and can only be used once.
                </p>
              </div>
              <p style="font-size: 13px; color: #6B7280; margin: 0 0 12px; word-break: break-all;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #FF6B00; text-decoration: underline;">${resetUrl}</a>
              </p>
              <hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 28px 0 20px;">
              <p style="font-size: 13px; color: #9CA3AF; margin: 0;">
                If you did not request this password reset, please ignore this email. Your existing password will remain secure and unchanged.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 18px 36px; text-align: center; border-top: 1px solid #F1F5F9;">
              <p style="font-size: 12px; color: #9CA3AF; margin: 0;">
                © 2026 FiftyFifty Gym Management Software • Secure Admin Portal
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Generates plain-text fallback for password reset.
 */
export const renderPasswordResetText = ({ resetUrl, recipientName = 'Super Admin', expiryMinutes = 15 }) => {
  return `FIFTYFIFTY GYM — RESET YOUR ADMIN PASSWORD

Hello ${recipientName},

We received a request to reset your FiftyFifty Gym Super Admin account password.

Please visit the link below to set a new password:
${resetUrl}

Notice: This password reset link will expire in ${expiryMinutes} minutes and can only be used once.

If you did not request this reset, please ignore this email. Your password remains unchanged.

© 2026 FiftyFifty Gym Management Software`;
};

/**
 * Convenience helper to send the password reset email.
 */
export const sendPasswordResetEmail = async ({ to, resetUrl, recipientName = 'Super Admin' }) => {
  const subject = 'Reset Your FiftyFifty Gym Admin Password';
  const htmlContent = renderPasswordResetHtml({ resetUrl, recipientName, expiryMinutes: 15 });
  const textContent = renderPasswordResetText({ resetUrl, recipientName, expiryMinutes: 15 });

  return sendEmail({
    to,
    subject,
    htmlContent,
    textContent,
    recipientName
  });
};

/**
 * Generates branded FiftyFifty Gym HTML email for Gym Owner invitation.
 */
export const renderGymOwnerInvitationHtml = ({
  gymName,
  ownerName = 'Gym Owner',
  loginUrl,
  ownerEmail,
  temporaryPassword
}) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to FiftyFifty Gym — Your Owner Portal Access</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header Bar -->
          <tr>
            <td style="padding: 28px 36px 20px; border-bottom: 1px solid #F1F5F9; text-align: left;">
              <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #111827;">
                <span style="color: #FF6B00;">FIFTYFIFTY</span> GYM
              </span>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 16px;">
                Welcome to FiftyFifty Gym! 🏋️
              </h1>
              <p style="font-size: 15px; color: #4B5563; margin: 0 0 16px;">
                Hello <strong>${ownerName}</strong>,
              </p>
              <p style="font-size: 15px; color: #4B5563; margin: 0 0 24px;">
                Congratulations! Your gym <strong>${gymName}</strong> has been successfully registered on the FiftyFifty Gym Management Platform. Your Gym Owner account is now ready.
              </p>

              <!-- Credentials Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin: 0 0 24px; padding: 20px;">
                <tr>
                  <td>
                    <p style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; margin: 0 0 12px;">
                      Your Login Credentials
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="4" border="0" style="font-size: 14px;">
                      <tr>
                        <td style="color: #64748B; width: 140px; font-weight: 500;">Login URL:</td>
                        <td><a href="${loginUrl}" style="color: #FF6B00; font-weight: 600; text-decoration: none;">${loginUrl}</a></td>
                      </tr>
                      <tr>
                        <td style="color: #64748B; font-weight: 500;">Login Email:</td>
                        <td style="color: #111827; font-weight: 600;">${ownerEmail}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748B; font-weight: 500;">Temporary Password:</td>
                        <td>
                          <code style="background-color: #FED7AA; color: #9A3412; padding: 4px 10px; border-radius: 6px; font-size: 14px; font-weight: 700; letter-spacing: 0.05em;">${temporaryPassword}</code>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #FF6B00;">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
                      Sign In to Gym Owner Portal
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #FFF7ED; border-left: 4px solid #FF6B00; padding: 12px 16px; border-radius: 6px; margin: 0 0 24px;">
                <p style="font-size: 13px; color: #9A3412; margin: 0; font-weight: 600;">
                  ⚠️ Security Notice: Please change your temporary password immediately after logging into your dashboard.
                </p>
              </div>

              <p style="font-size: 13px; color: #6B7280; margin: 0 0 12px;">
                If you encounter any issues accessing your dashboard, please reply directly to this email or reach out to our platform support.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 18px 36px; text-align: center; border-top: 1px solid #F1F5F9;">
              <p style="font-size: 12px; color: #9CA3AF; margin: 0;">
                © 2026 FiftyFifty Gym Management Software • Secure Multi-Gym Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Generates plain-text fallback for Gym Owner invitation.
 */
export const renderGymOwnerInvitationText = ({
  gymName,
  ownerName = 'Gym Owner',
  loginUrl,
  ownerEmail,
  temporaryPassword
}) => {
  return `FIFTYFIFTY GYM — WELCOME GYM OWNER

Hello ${ownerName},

Your gym "${gymName}" has been successfully registered on the FiftyFifty Gym Management Platform.

YOUR LOGIN CREDENTIALS:
- Portal URL: ${loginUrl}
- Email: ${ownerEmail}
- Temporary Password: ${temporaryPassword}

SECURITY NOTICE:
Please log in and update your temporary password immediately to ensure your account remains secure.

If you have any questions, please contact your platform administrator.

© 2026 FiftyFifty Gym Management Software`;
};

/**
 * Convenience helper to send the gym owner invitation email.
 */
export const sendGymOwnerInvitationEmail = async ({
  to,
  gymName,
  ownerName = 'Gym Owner',
  loginUrl,
  ownerEmail,
  temporaryPassword
}) => {
  const subject = `Welcome to FiftyFifty Gym — Owner Portal Access for ${gymName}`;
  const htmlContent = renderGymOwnerInvitationHtml({
    gymName,
    ownerName,
    loginUrl,
    ownerEmail,
    temporaryPassword
  });
  const textContent = renderGymOwnerInvitationText({
    gymName,
    ownerName,
    loginUrl,
    ownerEmail,
    temporaryPassword
  });

  return sendEmail({
    to,
    subject,
    htmlContent,
    textContent,
    recipientName: ownerName
  });
};

export default {
  getBrevoClient,
  sendEmail,
  sendPasswordResetEmail,
  renderPasswordResetHtml,
  renderPasswordResetText,
  sendGymOwnerInvitationEmail,
  renderGymOwnerInvitationHtml,
  renderGymOwnerInvitationText
};
