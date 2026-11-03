'use client';
import LoginForm from '@/components/LoginForm';
import {useAppPreferences} from '@/components/AppPreferences';
import Link from 'next/link';

export default function Login(){
  const {t}=useAppPreferences();
  return <main className="auth-bg">
    <Link href="/" className="brand auth-brand"><span className="brand-symbol">B✦</span>
      <span>BookStudio <b>AI</b><small>by DTSC</small></span></Link>
    <section className="auth-card"><div className="eyebrow">{t('login.eyebrow')}</div>
      <h1>{t('login.title')}</h1><p>{t('login.intro')}</p><LoginForm/>
    </section>
    <div className="auth-side">« {t('login.quote')} »</div>
  </main>;
}
