/**
 * Notification delivery service — integrates Resend (email) and Termii (SMS/WhatsApp).
 * Falls back to console.log in development.
 */
import { isProduction } from "@/lib/secrets";

export type DeliveryChannel = "EMAIL" | "SMS" | "WHATSAPP";

export interface DeliveryResult {
  success: boolean;
  channel: DeliveryChannel;
  messageId?: string;
  error?: string;
}

/**
 * Send an OTP code via the appropriate channel.
 * In development: logs to console and returns success.
 * In production: calls Resend (email) or Termii (SMS/WhatsApp).
 */
export async function deliverOtp(params: {
  channel: DeliveryChannel;
  to: string; // email or phone
  code: string;
  orgName?: string;
}): Promise<DeliveryResult> {
  const { channel, to, code, orgName = "VoteWise" } = params;

  // Dev mode: log and succeed
  if (!isProduction()) {
    console.log(`[VoteWise dev OTP] channel=${channel} to=${to} code=${code}`);
    return { success: true, channel, messageId: `dev-${Date.now()}` };
  }

  try {
    if (channel === "EMAIL") {
      return await sendEmailOtp(to, code, orgName);
    } else {
      return await sendTermiiOtp(to, code, channel, orgName);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown delivery error";
    console.error(`[VoteWise] OTP delivery failed: channel=${channel} to=${to} error=${message}`);
    return { success: false, channel, error: message };
  }
}

/**
 * Send OTP via Resend (email).
 */
async function sendEmailOtp(email: string, code: string, orgName: string): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, channel: "EMAIL", error: "RESEND_API_KEY not configured" };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: "VoteWise <noreply@votewise.com.ng>",
    to: email,
    subject: `Your VoteWise verification code — ${orgName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #163D2E;">VoteWise verification code</h2>
        <p style="color: #666; font-size: 14px;">${orgName} is verifying your identity for an upcoming election.</p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #163D2E; background: #f5f5f0; padding: 16px 32px; border-radius: 8px;">${code}</span>
        </div>
        <p style="color: #999; font-size: 12px;">This code expires in 5 minutes. Do not share it with anyone. VoteWise will never ask for your code.</p>
      </div>
    `,
  });

  if (error) {
    return { success: false, channel: "EMAIL", error: error.message };
  }

  return { success: true, channel: "EMAIL", messageId: data?.id };
}

/**
 * Send OTP via Termii (SMS or WhatsApp).
 */
async function sendTermiiOtp(phone: string, code: string, channel: DeliveryChannel, orgName: string): Promise<DeliveryResult> {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) {
    return { success: false, channel, error: "TERMII_API_KEY not configured" };
  }

  const senderId = process.env.TERMII_SENDER_ID || "VoteWise";
  const termiiChannel = channel === "WHATSAPP" ? "whatsapp" : "dnd";

  const response = await fetch("https://api.ng.termii.com/api/sms/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      message_type: "NUMERIC",
      to: phone,
      from: senderId,
      channel: termiiChannel,
      pin_attempts: 5,
      pin_time_to_live: 5,
      pin_length: 6,
      pin_placeholder: "< 123456 >",
      message_text: `Your ${orgName} verification code is < 123456 >. Do not share this code. It expires in 5 minutes.`,
      pin_data: code,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.code !== "ok") {
    return { success: false, channel, error: data.message || "Termii API error" };
  }

  return { success: true, channel, messageId: data.message_id };
}

/**
 * Send an election notification (not OTP).
 */
export async function sendNotification(params: {
  channel: DeliveryChannel;
  to: string;
  subject: string;
  body: string;
}): Promise<DeliveryResult> {
  const { channel, to, subject, body } = params;

  if (!isProduction()) {
    console.log(`[VoteWise dev notification] channel=${channel} to=${to} subject=${subject}`);
    return { success: true, channel, messageId: `dev-${Date.now()}` };
  }

  if (channel === "EMAIL") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { success: false, channel, error: "RESEND_API_KEY not configured" };

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "VoteWise <noreply@votewise.com.ng>",
      to,
      subject,
      html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;"><h2 style="color: #163D2E;">${subject}</h2><p style="color: #666; font-size: 14px;">${body}</p></div>`,
    });

    if (error) return { success: false, channel, error: error.message };
    return { success: true, channel, messageId: data?.id };
  }

  // SMS/WhatsApp via Termii
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) return { success: false, channel, error: "TERMII_API_KEY not configured" };

  const senderId = process.env.TERMII_SENDER_ID || "VoteWise";
  const response = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      to,
      from: senderId,
      sms: `${subject}: ${body}`,
      type: "plain",
      channel: channel === "WHATSAPP" ? "whatsapp" : "generic",
    }),
  });

  const data = await response.json();
  if (!response.ok) return { success: false, channel, error: data.message || "Termii error" };
  return { success: true, channel, messageId: data.message_id };
}
