import { I18nProvider } from '@/i18n/provider';
import { getLocale } from '@/i18n/request';

/**
 * The sign-in screen needs the dictionary too, and it sits outside the app
 * layout — nobody is signed in yet. It gets its own provider rather than one in
 * the root layout, because the root layout renders `<html>` and has to stay
 * statically renderable for the precached offline page.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale={await getLocale()}>{children}</I18nProvider>;
}
