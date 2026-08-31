export function normalizePhone(phone) {
  if (!phone) return null;

  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, "");

  // Convert leading '0' to '254'
  if (digits.startsWith("0")) {
    digits = "254" + digits.slice(1);
  }
  // If it starts with '254', ensure no extra leading zero after the country code
  else if (digits.startsWith("254")) {
    // If length is 13 and the 4th character is '0', remove it
    if (digits.length === 13 && digits[3] === "0") {
      digits = "254" + digits.slice(4);
    }
  }
  // If not starting with '254', prepend it
  else {
    digits = "254" + digits;
  }

  return digits;
}