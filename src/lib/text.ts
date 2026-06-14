/**
 * Strips diacritics so searches are accent-insensitive: "szék" and "szek"
 * (and a query of "sze") all fold to the same ASCII-ish form. Decomposes
 * accented characters via NFD, then removes the resulting diacritic marks.
 */
export function foldAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
