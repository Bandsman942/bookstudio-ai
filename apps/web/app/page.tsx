'use client';
import Link from 'next/link';
import {APP_VERSION} from '@/lib/version';
import {useAppPreferences} from '@/components/AppPreferences';

export default function Home(){
  const {t}=useAppPreferences();
  return <main className="landing">
    <header className="public-header">
      <div className="brand"><span className="brand-symbol">B✦</span><span>BookStudio <b>AI</b><small>by DTSC</small></span></div>
      <Link className="button small" href="/login">{t('home.open')}</Link>
    </header>
    <section className="hero">
      <div className="eyebrow">{t('home.eyebrow')}</div>
      <h1>{t('home.heading')} <em>{t('home.idea')}</em></h1>
      <p>{t('home.description')}</p>
      <Link href="/login" className="button">{t('home.cta')}</Link>
      <div className="hero-notes"><span>✦ {t('home.structured')}</span>
        <span>✦ {t('home.history')}</span><span>✦ {t('home.private')}</span></div>
    </section>
    <div className="preview"><span className="eyebrow">{t('home.preview')}</span>
      <div className="paper"><small>{t('home.chapter')}</small>
        <h2>{t('home.previewTitle')}</h2><p>{t('home.previewText')}</p>
        <p>{t('home.previewWelcome')}</p>
      </div>
    </div>
    <footer className="public-footer">© 2026 BookStudio AI · {t('home.footer')} · v{APP_VERSION}</footer>
  </main>;
}
