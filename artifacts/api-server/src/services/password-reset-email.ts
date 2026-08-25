import { ReplitConnectors } from "@replit/connectors-sdk";

const DEFAULT_FROM = "Tattoo Record <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
      to: [to],
      subject: "Reset your Tattoo Record password",
      text: [
        "We received a request to reset your Tattoo Record password.",
        "",
        `Reset your password: ${resetUrl}`,
        "",
        "This link expires in 30 minutes. If you did not request this, you can ignore this email.",
      ].join("\n"),
      html: `
        <p>We received a request to reset your Tattoo Record password.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>
      `,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("[password-reset] Resend rejected email", {
      status: response.status,
      details: details.slice(0, 500),
    });
    throw new Error(`Password reset email failed with status ${response.status}`);
  }
}