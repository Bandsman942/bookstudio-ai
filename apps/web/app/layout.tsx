import './styles.css';
import {cookies} from 'next/headers';
import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {AppPreferencesProvider} from '@/components/AppPreferences';
import {LOCALE_COOKIE,THEME_COOKIE,parseLocale,parseTheme} from '@/lib/i18n';

export const metadata:Metadata={
  title:'BookStudio AI by DTSC',
  description:'Atelier éditorial intelligent et privé.'
};

/** Server-side cookie resolution prevents a light-theme/FR flash at navigation. */
export default async function RootLayout({children}:{children:ReactNode}){
  const jar=await cookies();
  const locale=parseLocale(jar.get(LOCALE_COOKIE)?.value);
  const theme=parseTheme(jar.get(THEME_COOKIE)?.value);
  return <html lang={locale} data-theme={theme} suppressHydrationWarning>
    <body><AppPreferencesProvider initialLocale={locale} initialTheme={theme}>
      {children}
    </AppPreferencesProvider></body>
  </html>;
}
