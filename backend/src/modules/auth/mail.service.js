import {
  getAuthMailDeliveryTimeoutMs,
  getFrontendOrigin,
} from "./auth.constants.js";

const EMAIL_PURPOSES = Object.freeze({
  MFA_LOGIN: {
    subject: "Your QA Lab verification code",
    heading: "Verify your sign-in",
    ttl: "5 minutes",
  },
  REGISTER: {
    subject: "Verify your QA Lab email address",
    heading: "Verify your email address",
    ttl: "24 hours",
    path: "verify-identifier",
    button: "Verify Email",
  },
  ADMIN_INVITATION: {
    subject: "You are invited to QA Lab",
    heading: "Activate your QA Lab account",
    ttl: "24 hours",
    path: "activate-account",
    button: "Activate Account",
  },
  RESET_PASSWORD: {
    subject: "Reset your QA Lab password",
    heading: "Reset your password",
    ttl: "15 minutes",
    path: "reset-password",
    button: "Reset Password",
  },
});

function requireValue(name) {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(`${name} wajib diisi untuk pengiriman email Resend`);
  return value;
}

function requireRecipient(email) {
  const recipient = email?.trim();
  if (!recipient)
    throw new Error("Email penerima wajib diisi untuk pengiriman email");
  return recipient;
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}

function getGreeting(name) {
  return name ? `Hello, ${escapeHtml(name)}.` : "Hello,";
}

function getActionUrl(path, secret) {
  return `${getFrontendOrigin()}/${path}?token=${encodeURIComponent(secret)}`;
}

function emailShell(content) {
  return `<!doctype html><html><body style="margin:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#0f274d"><main style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden"><header style="padding:28px;background:#071f4a;color:#fff;font-size:28px;font-weight:700">QA <span style="color:#60a5fa">Lab</span></header><section style="padding:42px 48px;line-height:1.55;font-size:18px">${content}</section><footer style="padding:24px 48px;background:#f8fafc;color:#64748b;text-align:center">QA Lab</footer></main></body></html>`;
}

function actionEmailTemplate({ name, secret, definition }) {
  const action = getActionUrl(definition.path, secret);
  const safeAction = escapeHtml(action);
  return {
    subject: definition.subject,
    text: `${definition.heading}\n\n${action}\n\nThis link expires in ${definition.ttl} and can only be used once. If you did not request this, you can ignore this email.`,
    html: emailShell(
      `<h1 style="font-size:32px;margin:0 0 24px">${definition.heading}</h1><p>${getGreeting(name)}</p><p>Use the button below to continue.</p><p style="margin:30px 0"><a href="${safeAction}" style="display:block;padding:14px 18px;border-radius:8px;background:#2563eb;color:#fff;text-align:center;font-weight:700;text-decoration:none">${definition.button}</a></p><p>This link expires in ${definition.ttl} and can only be used once.</p><p>If you did not request this, you can ignore this email.</p><p style="font-size:14px;color:#64748b">If the button does not work, copy and paste this link into your browser:<br>${safeAction}</p>`,
    ),
  };
}

function otpEmailTemplate({ name, secret, definition }) {
  const safeOtp = escapeHtml(secret);
  return {
    subject: definition.subject,
    text: `Your QA Lab verification code is ${secret}. It expires in ${definition.ttl}. Do not share this code with anyone.`,
    html: emailShell(
      `<h1 style="font-size:32px;margin:0 0 24px">${definition.heading}</h1><p>${getGreeting(name)}</p><p>Enter this code to continue:</p><p style="margin:28px 0;padding:18px;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-size:32px;font-weight:700;letter-spacing:8px;text-align:center">${safeOtp}</p><p>This code expires in ${definition.ttl}. Do not share it with anyone.</p>`,
    ),
  };
}

function passwordChangedTemplate(name) {
  return {
    subject: "Your QA Lab password was changed",
    text: "Your QA Lab password was changed. All active sessions have been signed out. If you did not make this change, contact your administrator immediately.",
    html: emailShell(
      `<h1 style="font-size:32px;margin:0 0 24px">Your password was changed</h1><p>${getGreeting(name)}</p><p>Your password was successfully changed. All active sessions have been signed out.</p><p style="padding:18px;background:#eff6ff;border-radius:10px">If you did not make this change, contact your administrator immediately.</p>`,
    ),
  };
}

export function validateMailConfig() {
  requireValue("RESEND_API_KEY");
  requireValue("MAIL_FROM");
  getFrontendOrigin();
}

async function sendResendMessage({ email, subject, text, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireValue("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: requireValue("MAIL_FROM"),
      to: [requireRecipient(email)],
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(getAuthMailDeliveryTimeoutMs()),
  });
  if (!response.ok)
    throw new Error(`Resend rejected email with status ${response.status}`);
  return response.json();
}

export async function sendAuthMail({ email, name, purpose, secret }) {
  validateMailConfig();
  if (!secret)
    throw new Error("Secret autentikasi wajib tersedia untuk pengiriman email");
  const definition = EMAIL_PURPOSES[purpose];
  if (!definition) throw new Error("Tujuan email autentikasi tidak didukung");
  const message =
    purpose === "MFA_LOGIN"
      ? otpEmailTemplate({ name, secret, definition })
      : actionEmailTemplate({ name, secret, definition });
  return sendResendMessage({ email, ...message });
}

export async function sendPasswordChangedMail({ email, name }) {
  validateMailConfig();
  return sendResendMessage({ email, ...passwordChangedTemplate(name) });
}
