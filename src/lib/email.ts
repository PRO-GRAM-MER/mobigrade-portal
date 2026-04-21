import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@mobigrade.in",
    to,
    subject: "Reset your MobiGrade Portal password",
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #2F3567; font-size: 24px; font-weight: 700; margin: 0;">MobiGrade Portal</h1>
        </div>
        <h2 style="color: #0F172A; font-size: 20px; font-weight: 600;">Reset your password</h2>
        <p style="color: #64748B; line-height: 1.6;">
          We received a request to reset your password. Click the button below to set a new password.
          This link expires in <strong>1 hour</strong>.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
            style="background: #2F3567; color: #ffffff; padding: 14px 28px; border-radius: 8px;
                   text-decoration: none; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #94A3B8; font-size: 13px;">
          If you didn't request this, ignore this email. Your password will not change.
        </p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
        <p style="color: #94A3B8; font-size: 12px; text-align: center;">
          MobiGrade Portal — B2B Mobile Marketplace
        </p>
      </div>
    `,
  })
}
