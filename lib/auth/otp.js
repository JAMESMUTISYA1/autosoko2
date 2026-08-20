// lib/auth/otp.js
import crypto from "crypto";
import { sendSms } from "@/lib/sms";

const OTP_SECRET = process.env.OTP_SECRET || "dev-otp-secret-change-me";

export function generateOtp() {
  // 6-digit numeric code
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(code) {
  return crypto
    .createHash("sha256")
    .update(`${code}:${OTP_SECRET}`)
    .digest("hex");
}

export async function sendOtpSms(phone, code) {
  const message = `Your AutoSoko verification code is ${code}. It expires in 5 minutes.`;
  return sendSms(phone, message);
}