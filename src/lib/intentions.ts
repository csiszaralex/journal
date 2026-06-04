/**
 * Splits an intention text written as "Category: rest" into a separate
 * category and the remaining text. The part before the first colon becomes
 * the category when it is a sensible label (non-empty, single line, short,
 * and followed by actual content). Otherwise the whole text is kept as-is
 * with no category.
 *
 * Pure and client-safe — used both for storage (server) and for the live
 * chip preview in the form (client).
 */
export const MAX_CATEGORY_LENGTH = 30;

/**
 * Normalizes a category name so "munka" and "Munka" collapse to the same
 * category: the first letter is uppercased, the rest is left untouched (so
 * acronyms like "IT" survive). Whitespace is trimmed.
 */
export function normalizeCategory(name: string): string {
  const t = name.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function parseCategory(raw: string): {
  category: string | null;
  text: string;
} {
  const trimmed = raw.trim();
  const colon = trimmed.indexOf(":");
  if (colon === -1) return { category: null, text: trimmed };

  const prefix = trimmed.slice(0, colon).trim();
  const rest = trimmed.slice(colon + 1).trim();

  const valid =
    prefix.length > 0 &&
    prefix.length <= MAX_CATEGORY_LENGTH &&
    !/[\r\n]/.test(prefix) &&
    rest.length > 0;

  if (!valid) return { category: null, text: trimmed };
  return { category: normalizeCategory(prefix), text: rest };
}
