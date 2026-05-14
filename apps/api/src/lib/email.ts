import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "noreply@yourcompany.com",
      to,
      subject: "Your verification code",
      text: `Your one-time code is: ${code}\n\nThis code expires in 10 minutes. Do not share it.`,
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:24px">
          <h2 style="color:#1e40af;margin:0 0 8px">Verification Code</h2>
          <p style="color:#475569;margin:0 0 20px;font-size:14px">Use the code below to complete your sign-in.</p>
          <div style="background:#f1f5f9;border-radius:8px;padding:20px;text-align:center">
            <span style="font-size:2.5rem;font-weight:700;letter-spacing:0.3em;color:#0f172a;font-family:monospace">${code}</span>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin:16px 0 0">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>
      `,
    });
  } catch (error) {
    console.warn(`[warn] Failed to send OTP email to ${to}:`, error);
    console.warn(`[dev] OTP code for ${to}: ${code}`);
  }
}
