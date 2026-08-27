// lib/sms.js
export async function sendSms(phone, message) {
  // Normalize phone: remove all non-digits, then ensure format 254XXXXXXXXX
  let mobile = phone.replace(/\D/g, ""); // remove +, spaces, dashes, etc.
  if (mobile.startsWith("0")) {
    mobile = "254" + mobile.slice(1); // convert 0XXXXXXXX to 254XXXXXXXX
  } else if (!mobile.startsWith("254")) {
    mobile = "254" + mobile; // prepend 254 if missing
  }

  if (mobile.length !== 12 || !mobile.startsWith("254")) {
    throw new Error(`Invalid phone number: ${phone}`);
  }

  const apiKey = process.env.TEXTSMS_API_KEY;
  const partnerID = process.env.TEXTSMS_PARTNER_ID;
  const shortcode = process.env.TEXTSMS_SHORTCODE || "AutoSoko";

  if (!apiKey || !partnerID) {
    throw new Error("Missing TEXTSMS_API_KEY or TEXTSMS_PARTNER_ID");
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    partnerID: partnerID,
    message: message,
    shortcode: shortcode,
    mobile: mobile,
  });

  const url = `https://sms.textsms.co.ke/api/services/sendsms/?${params.toString()}`;
  console.log("SMS Request URL:", url);

  const res = await fetch(url, { method: "GET" });
  const body = await res.text();
  console.log("SMS Response Status:", res.status);
  console.log("SMS Response Body:", body);

  if (res.status !== 200) {
    throw new Error(`SMS API HTTP ${res.status}: ${body}`);
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    if (body.includes("success") || body.includes("OK")) {
      return { ok: true, provider: "textsms" };
    }
    throw new Error("SMS API returned non-JSON response: " + body);
  }

  // Check success patterns (same as PHP)
  if (
    (data.responses && data.responses[0]?.["response-code"] === 200) ||
    (data.status && data.status.toLowerCase() === "success") ||
    body.includes("success") ||
    body.includes("OK")
  ) {
    return { ok: true, provider: "textsms", data };
  }

  throw new Error(`SMS API error: ${JSON.stringify(data)}`);
}