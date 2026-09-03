// Normalize text: lowercase and remove diacritics.

export function normalizeText(value) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}