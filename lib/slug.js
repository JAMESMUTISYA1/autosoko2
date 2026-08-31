import { db } from "@/lib/db";

export function slugify(input) {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// Appends -2, -3, ... until the slug is unique. Businesses is small enough
// that this loop is fine; revisit if that stops being true.
export async function uniqueBusinessSlug(name) {
  const base = slugify(name) || "business";
  let candidate = base;
  let suffix = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db.business.findFirst({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

// Product.slug is only unique WITHIN a business (@@unique([businessId, slug])
// in the schema), so the uniqueness check is scoped to businessId rather
// than global like uniqueBusinessSlug above.
export async function uniqueProductSlug(businessId, name) {
  const base = slugify(name) || "product";
  let candidate = base;
  let suffix = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db.product.findFirst({ where: { businessId, slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}