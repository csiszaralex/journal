export const DEFAULT_TAG_COLOR = '#9ca3af';

export function randomTagColor(): string {
  const h = Math.floor(Math.random() * 360);
  const s = 55 + Math.floor(Math.random() * 35);
  const l = 45 + Math.floor(Math.random() * 25);
  return hslToHex(h, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => {
    const v = lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Deterministic, stable color for a category derived from its name, so every
 * category is colored without any setup. The same name always maps to the same
 * hue. Used as the default when there is no user override.
 */
export function categoryColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return hslToHex(hue, 60, 55);
}

/** Resolves a category's color: user override if present, else the auto color. */
export function resolveCategoryColor(
  name: string,
  overrides?: Record<string, string> | null,
): string {
  return overrides?.[name] ?? categoryColor(name);
}

export function getContrastTextColor(bgHex: string): '#000000' | '#ffffff' {
  const hex = bgHex.replace('#', '');
  if (hex.length !== 6) return '#000000';
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? '#000000' : '#ffffff';
}

export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

