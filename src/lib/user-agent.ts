type Matcher = { regex: RegExp; name: string };

const BROWSER_MATCHERS: Matcher[] = [
  { regex: /Edg\//, name: 'Edge' },
  { regex: /OPR\/|Opera/, name: 'Opera' },
  { regex: /Firefox\//, name: 'Firefox' },
  { regex: /Chrome\//, name: 'Chrome' }, // Fontos: Edge és Opera után kell maradnia
  { regex: /Safari\//, name: 'Safari' },
];

const OS_MATCHERS: Matcher[] = [
  { regex: /iPhone/, name: 'iPhone' },
  { regex: /iPad/, name: 'iPad' },
  { regex: /Android/, name: 'Android' },
  { regex: /Windows/, name: 'Windows' },
  { regex: /Mac OS X|Macintosh/, name: 'Mac' },
  { regex: /Linux/, name: 'Linux' },
];

const findMatch = (ua: string, matchers: Matcher[]): string | null => {
  return matchers.find((m) => m.regex.test(ua))?.name ?? null;
};

export function friendlyNameFromUA(ua: string | null | undefined): string {
  if (!ua) return 'Unknown device';

  const browser = findMatch(ua, BROWSER_MATCHERS);
  const os = findMatch(ua, OS_MATCHERS);

  if (browser && os) return `${browser} on ${os}`;
  if (browser) return browser;
  if (os) return os;

  return 'Unknown device';
}

