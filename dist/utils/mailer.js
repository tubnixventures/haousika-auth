// mailer.ts
import { SendMailClient } from "zeptomail";
import dotenv from "dotenv";
dotenv.config();
const url = "https://api.zeptomail.com/v1.1/email";
const token = process.env.ZEPTO_TOKEN; // store your Zepto API key in .env
const client = new SendMailClient({ url, token });
/**
 * Generic mail sender
 */
export async function sendMail(to, subject, html) {
    return client.sendMail({
        from: {
            address: "noreply@housika.co.ke",
            name: "Housika Team",
        },
        to: [
            {
                email_address: {
                    address: to,
                    name: to.split("@")[0], // fallback name
                },
            },
        ],
        subject,
        htmlbody: html,
    });
}
/**
 * Build a professional HTML template with header/footer
 */
function buildTemplate(title, bodyContent) {
    return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:20px;font-family:Arial,sans-serif;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr style="background:#004aad;color:#ffffff;">
            <td style="padding:20px;font-size:20px;font-weight:bold;" align="center">
              ${title}
            </td>
          </tr>
          <tr>
            <td style="padding:30px;font-size:16px;color:#333;">
              ${bodyContent}
            </td>
          </tr>
          <tr style="background:#f1f1f1;">
            <td style="padding:15px;font-size:12px;color:#666;text-align:center;">
              &copy; ${new Date().getFullYear()} Housika Properties. All rights reserved.<br/>
              Sent from noreply@housika.co.ke
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;
}
/**
 * Specialized helpers
 */
export async function sendSignupAlert(to, displayName) {
    const html = buildTemplate("Welcome to Housika", `<p>Hello ${displayName},</p>
     <p>Your account has been created successfully. Please verify your email to activate your account.</p>`);
    return sendMail(to, "Welcome to Housika", html);
}
export async function sendVerificationCode(to, code) {
    const html = buildTemplate("Verify Your Account", `<p>Use the following verification code:</p>
     <p style="font-size:24px;font-weight:bold;color:#004aad;text-align:center;">${code}</p>
     <p>This code will expire in 10 minutes.</p>`);
    return sendMail(to, "Account Verification Code", html);
}
export async function sendUpgradeNotification(to, newRole) {
    const html = buildTemplate("Account Upgrade", `<p>Your account role has been upgraded to <strong>${newRole}</strong>.</p>
     <p>If you did not request this change, please contact support immediately.</p>`);
    return sendMail(to, "Account Upgrade Notification", html);
}
export async function sendResetEmail(to, otp, resetLink) {
    const html = buildTemplate("Password Reset", `<p>You requested to reset your password. Use the following OTP:</p>
     <p style="font-size:24px;font-weight:bold;color:#004aad;text-align:center;">${otp}</p>
     <p>Or click the button below to reset your password:</p>
     <p style="text-align:center;">
       <a href="${resetLink}" style="background:#004aad;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">
         Reset Password
       </a>
     </p>
     <p>This link and OTP will expire in 10 minutes.</p>`);
    return sendMail(to, "Password Reset Request", html);
}
