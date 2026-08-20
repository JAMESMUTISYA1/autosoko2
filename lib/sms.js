// lib/sms.js
export async function sendSms(phone, message) {
  const isDev = process.env.NODE_ENV === "development";

  // In development, log to console unless SMS_MODE=live
  if (isDev && process.env.SMS_MODE !== "live") {
    console.log(`[SMS:DEV] to ${phone}: ${message}`);
    return { ok: true, provider: "console" };
  }

  const apiKey = process.env.TEXTSMS_API_KEY;
  const senderId = process.env.TEXTSMS_SENDER_ID || "AutoSoko";

  if (!apiKey) {
    throw new Error("TEXTSMS_API_KEY is not configured.");
  }

  // textsms.co.ke API: https://api.textsms.co.ke/send/
  const params = new URLSearchParams({
    apikey: apiKey,
    senderid: senderId,
    message: message,
    phone: phone,
  });

  const res = await fetch(`https://api.textsms.co.ke/send/?${params.toString()}`, {
    method: "GET", // or POST depending on their docs; GET is common for this provider
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "SMS sending failed");
  }
  return data;
}