// Normalize phone to digits only with Kenyan country code if applicable.
// Input could be:
//   "0748094350" -> "254748094350"
//   "+254748094350" -> "254748094350"
//   "254748094350" -> "254748094350"
export function normalizePhone(phone) {
  if (!phone) return null;

  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, "");

  // Convert leading '0' to '254'
  if (digits.startsWith("0")) {
    digits = "254" + digits.slice(1);
  }
  // If it starts with '254', keep as is; otherwise prepend '254'
  else if (!digits.startsWith("254")) {
    digits = "254" + digits;
  }

  return digits;
}