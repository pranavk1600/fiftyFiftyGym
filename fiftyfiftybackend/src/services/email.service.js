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
  recipientName = '',
  attachments
}) => {
  if (!to || !to.trim()) {
    throw new Error('Recipient email is required.');
  }
  if (!subject || !subject.trim()) {
    throw new Error('Email subject is required.');
  }

  // Intercept if test mock is configured
  if (customEmailDispatcher) {
    return customEmailDispatcher({ to, subject, htmlContent, textContent, recipientName, attachments });
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
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      payload.attachment = attachments;
    }

    const response = await client.transactionalEmails.sendTransacEmail(payload);

    const messageId = response?.messageId || 'accepted';
    console.log(`[Email Service] Transactional email "${subject}" accepted by Brevo for <${to}> (messageId: ${messageId})`);

    return {
      success: true,
      messageId
    };
  } catch (error) {
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
 * Generates branded FiftyFifty Gym HTML email for Gym Owner password reset.
 * Prominently features the specific gym name alongside FiftyFifty Gym branding.
 */
export const renderGymOwnerPasswordResetHtml = ({
  resetUrl,
  recipientName = 'Gym Owner',
  gymName = 'FiftyFifty Gym',
  expiryMinutes = 15
}) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password — ${gymName} Owner Portal</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0B0F19; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header Bar -->
          <tr>
            <td style="padding: 28px 36px 20px; border-bottom: 1px solid #1F2937; text-align: left; background: #161F30;">
              <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #FFFFFF;">
                <span style="color: #FF6B00;">FIFTYFIFTY</span> GYM
              </span>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <div style="display: inline-block; padding: 4px 10px; background-color: rgba(255, 107, 0, 0.15); border: 1px solid rgba(255, 107, 0, 0.3); border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #FF6B00; margin-bottom: 12px;">
                ${gymName} • Owner Portal
              </div>
              <h1 style="font-size: 22px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px;">
                Reset Your Gym Owner Password
              </h1>
              <p style="font-size: 15px; color: #94A3B8; margin: 0 0 16px;">
                Hello <strong style="color: #F8FAFC;">${recipientName}</strong>,
              </p>
              <p style="font-size: 15px; color: #94A3B8; margin: 0 0 24px;">
                We received a request to reset the password for your Gym Owner account for <strong style="color: #FF6B00;">${gymName}</strong>. Click the button below to choose a new password:
              </p>
              <!-- Call to Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 28px;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #FF6B00;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
                      Reset Gym Owner Password
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color: rgba(255, 107, 0, 0.1); border-left: 4px solid #FF6B00; padding: 12px 16px; border-radius: 6px; margin: 0 0 24px;">
                <p style="font-size: 13px; color: #FED7AA; margin: 0; font-weight: 600;">
                  ⚠️ This reset link will expire in ${expiryMinutes} minutes and can only be used once.
                </p>
              </div>
              <p style="font-size: 13px; color: #64748B; margin: 0 0 12px; word-break: break-all;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #FF6B00; text-decoration: underline;">${resetUrl}</a>
              </p>
              <hr style="border: 0; border-top: 1px solid #1F2937; margin: 28px 0 20px;">
              <p style="font-size: 13px; color: #64748B; margin: 0;">
                If you did not request this password reset, please ignore this email. Your existing password will remain secure and unchanged.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #0F172A; padding: 18px 36px; text-align: center; border-top: 1px solid #1F2937;">
              <p style="font-size: 12px; color: #64748B; margin: 0;">
                © 2026 FiftyFifty Gym Management Software • ${gymName} Owner Portal
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
 * Generates plain-text fallback for Gym Owner password reset.
 */
export const renderGymOwnerPasswordResetText = ({
  resetUrl,
  recipientName = 'Gym Owner',
  gymName = 'FiftyFifty Gym',
  expiryMinutes = 15
}) => {
  return `FIFTYFIFTY GYM — RESET YOUR GYM OWNER PASSWORD (${gymName})

Hello ${recipientName},

We received a request to reset the password for your Gym Owner account for ${gymName}.

Please visit the link below to set a new password:
${resetUrl}

Notice: This password reset link will expire in ${expiryMinutes} minutes and can only be used once.

If you did not request this reset, please ignore this email. Your password remains unchanged.

© 2026 FiftyFifty Gym Management Software • ${gymName}`;
};

/**
 * Convenience helper to send the gym owner password reset email.
 */
export const sendGymOwnerPasswordResetEmail = async ({
  to,
  resetUrl,
  gymName = 'FiftyFifty Gym',
  recipientName = 'Gym Owner',
  expiryMinutes = 15
}) => {
  const subject = `Reset Your Password — ${gymName} Owner Portal`;
  const htmlContent = renderGymOwnerPasswordResetHtml({ resetUrl, recipientName, gymName, expiryMinutes });
  const textContent = renderGymOwnerPasswordResetText({ resetUrl, recipientName, gymName, expiryMinutes });

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
 * Uses secure, single-use, expiring invitation link for password setup.
 * Never sends plaintext passwords through email.
 */
export const renderGymOwnerInvitationHtml = ({
  gymName,
  ownerName = 'Gym Owner',
  loginUrl,
  ownerEmail,
  activationUrl,
  expiryHours = 48,
  temporaryPassword
}) => {
  const ctaUrl = activationUrl || loginUrl;
  const ctaText = activationUrl ? 'Activate Account & Set Password' : 'Sign In to Gym Portal';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to FiftyFifty Gym — Your Owner Portal Access</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0B0F19; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header Bar -->
          <tr>
            <td style="padding: 28px 36px 20px; border-bottom: 1px solid #1F2937; text-align: left; background: #161F30;">
              <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #FFFFFF;">
                <span style="color: #FF6B00;">FIFTYFIFTY</span> GYM
              </span>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <h1 style="font-size: 22px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px;">
                Welcome to FiftyFifty Gym! 🏋️
              </h1>
              <p style="font-size: 15px; color: #94A3B8; margin: 0 0 16px;">
                Hello <strong style="color: #F8FAFC;">${ownerName}</strong>,
              </p>
              <p style="font-size: 15px; color: #94A3B8; margin: 0 0 24px;">
                Congratulations! Your gym <strong style="color: #FF6B00;">${gymName}</strong> has been successfully registered on the FiftyFifty Gym Management Platform. Your dedicated gym portal is ready.
              </p>

              <!-- Portal Details Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1E293B; border: 1px solid #334155; border-radius: 12px; margin: 0 0 24px; padding: 20px;">
                <tr>
                  <td>
                    <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94A3B8; margin: 0 0 12px;">
                      Your Portal Access Details
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="6" border="0" style="font-size: 14px;">
                      <tr>
                        <td style="color: #94A3B8; width: 140px; font-weight: 500;">Gym Name:</td>
                        <td style="color: #FFFFFF; font-weight: 600;">${gymName}</td>
                      </tr>
                      <tr>
                        <td style="color: #94A3B8; font-weight: 500;">Owner Email:</td>
                        <td style="color: #FFFFFF; font-weight: 600;">${ownerEmail}</td>
                      </tr>
                      <tr>
                        <td style="color: #94A3B8; font-weight: 500;">Gym Login URL:</td>
                        <td><a href="${loginUrl}" style="color: #FF6B00; font-weight: 600; text-decoration: none;">${loginUrl}</a></td>
                      </tr>
                      ${temporaryPassword ? `
                      <tr>
                        <td style="color: #94A3B8; font-weight: 500;">Temporary Password:</td>
                        <td>
                          <code style="background-color: #FED7AA; color: #9A3412; padding: 4px 10px; border-radius: 6px; font-size: 14px; font-weight: 700; letter-spacing: 0.05em;">${temporaryPassword}</code>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #FF6B00;">
                    <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              ${activationUrl ? `
              <div style="background-color: rgba(255, 107, 0, 0.1); border-left: 4px solid #FF6B00; padding: 12px 16px; border-radius: 6px; margin: 0 0 24px;">
                <p style="font-size: 13px; color: #FED7AA; margin: 0; font-weight: 600;">
                  🔒 Security Notice: This single-use setup link will expire in ${expiryHours} hours. Once set, you can sign in directly using your Gym Login URL.
                </p>
              </div>
              <p style="font-size: 13px; color: #64748B; margin: 0 0 12px; word-break: break-all;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="${activationUrl}" style="color: #FF6B00; text-decoration: underline;">${activationUrl}</a>
              </p>
              ` : `
              <div style="background-color: rgba(255, 107, 0, 0.1); border-left: 4px solid #FF6B00; padding: 12px 16px; border-radius: 6px; margin: 0 0 24px;">
                <p style="font-size: 13px; color: #FED7AA; margin: 0; font-weight: 600;">
                  ⚠️ Security Notice: Please change your temporary password immediately after logging into your dashboard.
                </p>
              </div>
              `}

              <p style="font-size: 13px; color: #64748B; margin: 0 0 12px;">
                If you encounter any issues accessing your dashboard, please reply directly to this email or reach out to our platform support.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #0F172A; padding: 18px 36px; text-align: center; border-top: 1px solid #1F2937;">
              <p style="font-size: 12px; color: #64748B; margin: 0;">
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
  activationUrl,
  expiryHours = 48,
  temporaryPassword
}) => {
  return `FIFTYFIFTY GYM — WELCOME GYM OWNER

Hello ${ownerName},

Your gym "${gymName}" has been successfully registered on the FiftyFifty Gym Management Platform.

YOUR PORTAL ACCESS DETAILS:
- Gym Name: ${gymName}
- Gym Login URL: ${loginUrl}
- Owner Email: ${ownerEmail}
${activationUrl ? `- Setup Password Link (Expires in ${expiryHours}h): ${activationUrl}` : ''}
${temporaryPassword ? `- Temporary Password: ${temporaryPassword}` : ''}

SECURITY NOTICE:
${activationUrl ? 'Please use the secure activation link above to set your permanent password.' : 'Please log in and update your temporary password immediately.'}

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
  activationUrl,
  expiryHours = 48,
  temporaryPassword
}) => {
  const subject = `Welcome to FiftyFifty Gym — Owner Portal Access for ${gymName}`;
  const htmlContent = renderGymOwnerInvitationHtml({
    gymName,
    ownerName,
    loginUrl,
    ownerEmail,
    activationUrl,
    expiryHours,
    temporaryPassword
  });
  const textContent = renderGymOwnerInvitationText({
    gymName,
    ownerName,
    loginUrl,
    ownerEmail,
    activationUrl,
    expiryHours,
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

/**
 * Generates responsive branded HTML email for Gym Member invitation and account activation.
 */
export const renderMemberInvitationHtml = ({
  gymName = 'FiftyFifty Gym',
  gymLogoUrl,
  memberName = 'Member',
  planName = 'Standard Plan',
  joinDate,
  expiryDate,
  loginUrl,
  activationUrl,
  expiryDays = 7
}) => {
  const brandOrange = '#FF6B00';
  const logoHtml = gymLogoUrl
    ? `<img src="${gymLogoUrl}" alt="${gymName}" style="max-height: 48px; max-width: 180px; object-fit: contain; margin-bottom: 12px; display: block;" />`
    : `<div style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em; margin-bottom: 12px;">${gymName}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ${gymName} – Your Member Portal Access</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080B12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080B12; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #111827; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Top Accent Bar -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #FF6B00 0%, #FF8533 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 36px 36px 20px; text-align: left;">
              ${logoHtml}
              <div style="display: inline-block; background: rgba(255, 107, 0, 0.12); color: ${brandOrange}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 10px; border-radius: 20px; margin-bottom: 14px;">
                MEMBER PORTAL INVITATION
              </div>
              <h1 style="margin: 0 0 10px; font-size: 22px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">
                Welcome to ${gymName}, ${memberName}!
              </h1>
              <p style="margin: 0; font-size: 14px; color: #94A3B8; line-height: 1.6;">
                Your membership account has been registered by your gym administrator. You can now activate your account to log workout attendance, view fee receipts, and access your personal fitness dashboard.
              </p>
            </td>
          </tr>

          <!-- Membership Details Summary Box -->
          <tr>
            <td style="padding: 10px 36px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #1A2234; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 18px 20px;">
                <tr>
                  <td style="padding-bottom: 10px; font-size: 13px; color: #94A3B8;">Member Name:</td>
                  <td align="right" style="padding-bottom: 10px; font-size: 13px; font-weight: 600; color: #FFFFFF;">${memberName}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px; font-size: 13px; color: #94A3B8;">Membership Plan:</td>
                  <td align="right" style="padding-bottom: 10px; font-size: 13px; font-weight: 600; color: ${brandOrange};">${planName}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px; font-size: 13px; color: #94A3B8;">Joining Date:</td>
                  <td align="right" style="padding-bottom: 10px; font-size: 13px; font-weight: 500; color: #E2E8F0;">${joinDate || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #94A3B8;">Membership Expiry:</td>
                  <td align="right" style="font-size: 13px; font-weight: 600; color: #F59E0B;">${expiryDate || 'N/A'}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Call to Action Button -->
          <tr>
            <td style="padding: 0 36px 28px; text-align: center;">
              <a href="${activationUrl}" target="_blank" style="display: inline-block; background-color: #FF6B00; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(255, 107, 0, 0.35);">
                Activate Account &amp; Set Password &rarr;
              </a>
              <div style="font-size: 12px; color: #64748B; margin-top: 10px;">
                This secure activation link will expire in ${expiryDays} days.
              </div>
            </td>
          </tr>

          <!-- Instructions & Member Login Link -->
          <tr>
            <td style="padding: 0 36px 32px;">
              <div style="background-color: rgba(255, 255, 255, 0.02); border-left: 3px solid #FF6B00; padding: 14px 16px; border-radius: 0 8px 8px 0;">
                <div style="font-size: 13px; font-weight: 600; color: #E2E8F0; margin-bottom: 4px;">
                  Dedicated Member Portal URL:
                </div>
                <div style="font-size: 12px; font-family: monospace; color: #94A3B8; word-break: break-all;">
                  <a href="${loginUrl}" style="color: #FF8533; text-decoration: underline;">${loginUrl}</a>
                </div>
                <div style="font-size: 12px; color: #94A3B8; margin-top: 8px; line-height: 1.5;">
                  Once your password is set, bookmark this page for easy one-click sign in on your mobile or desktop browser.
                </div>
              </div>
            </td>
          </tr>

          <!-- Security Notice & Footer -->
          <tr>
            <td style="background-color: #0D1322; padding: 20px 36px; border-top: 1px solid rgba(255, 255, 255, 0.04); font-size: 11px; color: #64748B; text-align: center; line-height: 1.6;">
              <p style="margin: 0 0 6px;">
                <strong>Security Protection:</strong> FiftyFifty Gym never sends plain-text passwords via email. You will create your own password via the secure single-use link above.
              </p>
              <p style="margin: 0;">
                &copy; 2026 FiftyFifty Gym &bull; Automated Member Invitation
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
 * Generates plain-text fallback email for Gym Member invitation.
 */
export const renderMemberInvitationText = ({
  gymName = 'FiftyFifty Gym',
  memberName = 'Member',
  planName = 'Standard Plan',
  joinDate,
  expiryDate,
  loginUrl,
  activationUrl,
  expiryDays = 7
}) => {
  return `WELCOME TO ${gymName.toUpperCase()} — YOUR MEMBER PORTAL ACCESS

Hello ${memberName},

Your membership account has been registered by your gym administrator.

MEMBERSHIP SUMMARY:
- Gym: ${gymName}
- Member Name: ${memberName}
- Plan: ${planName}
- Joining Date: ${joinDate || 'N/A'}
- Membership Expiry: ${expiryDate || 'N/A'}

ACTIVATE YOUR ACCOUNT & SET YOUR PASSWORD:
Click the link below to set your password (valid for ${expiryDays} days):
${activationUrl}

DEDICATED MEMBER LOGIN URL:
${loginUrl}

SECURITY NOTICE:
FiftyFifty Gym never sends plain-text passwords via email. Please use the secure activation link above to set your permanent password.

© 2026 FiftyFifty Gym Management Software`;
};

/**
 * Convenience helper to send the member invitation email.
 * Optionally attaches the generated PDF Membership Receipt.
 */
export const sendMemberInvitationEmail = async ({
  to,
  gymName,
  gymLogoUrl,
  memberName,
  planName,
  joinDate,
  expiryDate,
  loginUrl,
  activationUrl,
  expiryDays = 7,
  receiptPdfBuffer,
  receiptNumber
}) => {
  const subject = `Welcome to ${gymName} – Your Member Portal Access`;
  const htmlContent = renderMemberInvitationHtml({
    gymName,
    gymLogoUrl,
    memberName,
    planName,
    joinDate,
    expiryDate,
    loginUrl,
    activationUrl,
    expiryDays
  });
  const textContent = renderMemberInvitationText({
    gymName,
    memberName,
    planName,
    joinDate,
    expiryDate,
    loginUrl,
    activationUrl,
    expiryDays
  });

  const attachments = receiptPdfBuffer && receiptNumber ? [
    {
      name: `${receiptNumber}.pdf`,
      content: receiptPdfBuffer.toString('base64')
    }
  ] : undefined;

  return sendEmail({
    to,
    subject,
    htmlContent,
    textContent,
    recipientName: memberName,
    attachments
  });
};

/**
 * Sends or resends a standalone membership receipt email with PDF attachment.
 */
export const sendMemberReceiptEmail = async ({
  to,
  gymName,
  gymLogoUrl,
  memberName,
  planName,
  receiptNumber,
  amount,
  paymentStatus,
  joinDate,
  expiryDate,
  pdfBuffer
}) => {
  const isPaid = (paymentStatus || '').toUpperCase() === 'PAID';
  const subject = `${isPaid ? 'Payment Receipt' : 'Membership Acknowledgement'} ${receiptNumber} – ${gymName}`;

  const brandOrange = '#FF6B00';
  const logoHtml = gymLogoUrl
    ? `<img src="${gymLogoUrl}" alt="${gymName}" style="max-height: 48px; max-width: 180px; object-fit: contain; margin-bottom: 12px; display: block;" />`
    : `<div style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em; margin-bottom: 12px;">${gymName}</div>`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080B12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080B12; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #111827; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #FF6B00 0%, #FF8533 100%);"></td>
          </tr>
          <tr>
            <td style="padding: 36px 36px 20px;">
              ${logoHtml}
              <div style="display: inline-block; background: rgba(255, 107, 0, 0.12); color: ${brandOrange}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 10px; border-radius: 20px; margin-bottom: 14px;">
                ${isPaid ? 'PAYMENT RECEIPT' : 'REGISTRATION ACKNOWLEDGEMENT'}
              </div>
              <h1 style="margin: 0 0 10px; font-size: 22px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">
                Hello ${memberName},
              </h1>
              <p style="margin: 0; font-size: 14px; color: #94A3B8; line-height: 1.6;">
                Please find attached your official membership PDF document for <strong>${gymName}</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 36px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 18px;">
                <tr>
                  <td style="padding-bottom: 8px; font-size: 13px; color: #94A3B8;">Receipt Number:</td>
                  <td style="padding-bottom: 8px; font-size: 13px; font-weight: 600; color: #FF8533; text-align: right;">${receiptNumber}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 8px; font-size: 13px; color: #94A3B8;">Membership Plan:</td>
                  <td style="padding-bottom: 8px; font-size: 13px; font-weight: 600; color: #FFFFFF; text-align: right;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 8px; font-size: 13px; color: #94A3B8;">Status:</td>
                  <td style="padding-bottom: 8px; font-size: 13px; font-weight: 600; color: ${isPaid ? '#10B981' : '#F59E0B'}; text-align: right;">${isPaid ? 'PAID' : 'PAYMENT PENDING'}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #94A3B8;">Amount:</td>
                  <td style="font-size: 15px; font-weight: 700; color: #FFFFFF; text-align: right;">Rs. ${parseFloat(amount || 0).toFixed(2)}</td>
                </tr>
              </table>
              <div style="margin-top: 16px; padding: 12px 14px; background: rgba(255, 107, 0, 0.08); border-radius: 8px; font-size: 12px; color: #FF8533;">
                📎 <strong>Attachment Included:</strong> Your official PDF receipt (<code>${receiptNumber}.pdf</code>) is attached to this email.
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0D1322; padding: 18px 36px; border-top: 1px solid rgba(255, 255, 255, 0.04); font-size: 11px; color: #64748B; text-align: center;">
              &copy; 2026 ${gymName} &bull; Powered by FiftyFifty Gym Software
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textContent = `MEMBERSHIP RECEIPT — ${gymName.toUpperCase()}
Hello ${memberName},

Please find your official membership document attached.

Receipt Number: ${receiptNumber}
Membership Plan: ${planName}
Amount: Rs. ${parseFloat(amount || 0).toFixed(2)}
Status: ${paymentStatus}
Joining Date: ${joinDate || 'N/A'}
Expiry Date: ${expiryDate || 'N/A'}

Attachment: ${receiptNumber}.pdf

© 2026 ${gymName} • FiftyFifty Gym Management Software`;

  const attachments = pdfBuffer && receiptNumber ? [
    {
      name: `${receiptNumber}.pdf`,
      content: pdfBuffer.toString('base64')
    }
  ] : undefined;

  return sendEmail({
    to,
    subject,
    htmlContent,
    textContent,
    recipientName: memberName,
    attachments
  });
};

/**
 * Generates branded HTML email for Member Password Reset.
 */
export const renderMemberPasswordResetHtml = ({
  gymName = 'FiftyFifty Gym',
  memberName = 'Member',
  resetUrl,
  expiryMinutes = 15
}) => {
  const brandOrange = '#FF6B00';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset Request – ${gymName} Member Portal</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080B12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080B12; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #111827; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #FF6B00 0%, #FF8533 100%);"></td>
          </tr>
          <tr>
            <td style="padding: 36px 36px 20px;">
              <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 12px;">${gymName}</div>
              <div style="display: inline-block; background: rgba(255, 107, 0, 0.12); color: ${brandOrange}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 10px; border-radius: 20px; margin-bottom: 14px;">
                MEMBER PASSWORD RESET
              </div>
              <h1 style="margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #FFFFFF;">
                Password Reset Request
              </h1>
              <p style="margin: 0; font-size: 14px; color: #94A3B8; line-height: 1.6;">
                Hello ${memberName}, we received a request to reset your password for your <strong>${gymName}</strong> member account.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 36px 28px; text-align: center;">
              <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #FF6B00; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(255, 107, 0, 0.35);">
                Reset My Password &rarr;
              </a>
              <div style="font-size: 12px; color: #64748B; margin-top: 10px;">
                This link expires in ${expiryMinutes} minutes and can only be used once.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 36px 28px;">
              <div style="font-size: 12px; color: #64748B; line-height: 1.5;">
                If you did not request a password reset, you can safely ignore this email. Your current password remains active.
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0D1322; padding: 16px 36px; border-top: 1px solid rgba(255, 255, 255, 0.04); font-size: 11px; color: #64748B; text-align: center;">
              &copy; 2026 FiftyFifty Gym &bull; Member Account Security
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
 * Generates plain-text fallback email for Member Password Reset.
 */
export const renderMemberPasswordResetText = ({
  gymName = 'FiftyFifty Gym',
  memberName = 'Member',
  resetUrl,
  expiryMinutes = 15
}) => {
  return `PASSWORD RESET REQUEST — ${gymName.toUpperCase()} MEMBER PORTAL

Hello ${memberName},

We received a request to reset the password for your ${gymName} member account.

RESET YOUR PASSWORD:
Click the link below to set a new password:
${resetUrl}

This link will expire in ${expiryMinutes} minutes and can only be used once.

If you did not request this reset, you can safely disregard this message.

© 2026 FiftyFifty Gym Management Software`;
};

/**
 * Convenience helper to send the member password reset email.
 */
export const sendMemberPasswordResetEmail = async ({
  to,
  gymName,
  memberName,
  resetUrl,
  expiryMinutes = 15
}) => {
  const subject = `Password Reset Request – ${gymName} Member Portal`;
  const htmlContent = renderMemberPasswordResetHtml({
    gymName,
    memberName,
    resetUrl,
    expiryMinutes
  });
  const textContent = renderMemberPasswordResetText({
    gymName,
    memberName,
    resetUrl,
    expiryMinutes
  });

  return sendEmail({
    to,
    subject,
    htmlContent,
    textContent,
    recipientName: memberName
  });
};

export default {
  getBrevoClient,
  sendEmail,
  sendPasswordResetEmail,
  renderPasswordResetHtml,
  renderPasswordResetText,
  sendGymOwnerPasswordResetEmail,
  renderGymOwnerPasswordResetHtml,
  renderGymOwnerPasswordResetText,
  sendGymOwnerInvitationEmail,
  renderGymOwnerInvitationHtml,
  renderGymOwnerInvitationText,
  sendMemberInvitationEmail,
  renderMemberInvitationHtml,
  renderMemberInvitationText,
  sendMemberReceiptEmail,
  sendMemberPasswordResetEmail,
  renderMemberPasswordResetHtml,
  renderMemberPasswordResetText
};
