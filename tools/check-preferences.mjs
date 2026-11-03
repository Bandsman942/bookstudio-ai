import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const load=file=>fs.readFileSync(path.join(process.cwd(),file),'utf8');
const i18n=load('apps/web/lib/i18n.ts');
assert.ok(i18n.includes("export type Locale='fr'|'en'"));
assert.ok(i18n.includes("export type ThemePreference='light'|'dark'|'system'"));
assert.ok(i18n.includes('const en:Record<MessageKey,string>'),'English catalog must cover all French keys');
for(const marker of ['bookstudio_locale','bookstudio_theme','export function translate','catalogs[locale][key]'])
  assert.ok(i18n.includes(marker),'Missing preference/i18n contract '+marker);
const preferences=load('apps/web/components/AppPreferences.tsx');
for(const marker of ['SameSite=Lax','Max-Age=31536000','document.documentElement.lang=next',
 'document.documentElement.dataset.theme=next','usePreferenceActions','setTheme','setLocale'])
  assert.ok(preferences.includes(marker),'Missing preference persistence '+marker);
assert.ok(!preferences.includes('router.refresh()'),'Changing display preferences must not remount unsaved editor');
const layout=load('apps/web/app/layout.tsx');
for(const marker of ["cookies()","LOCALE_COOKIE","THEME_COOKIE","lang={locale}","data-theme={theme}"])
  assert.ok(layout.includes(marker),'SSR preferences lost '+marker);
const css=load('apps/web/app/styles.css');
for(const marker of [':root[data-theme="dark"]',':root[data-theme="system"]',
  'prefers-color-scheme:dark','--paper-ink','--input-surface','--menu-focus',
  '.context-menu{background:var(--surface)','color-scheme:dark'])
  assert.ok(css.includes(marker),'Dark theme contract missing '+marker);
const library=load('apps/web/components/LibraryClient.tsx');
const editor=load('apps/web/components/StudioEditor.tsx');
for(const [name,source] of [['library',library],['editor',editor]]){
  assert.ok(source.includes('usePreferenceActions'),'Missing preference menu on '+name);
  assert.ok(source.includes('useAppPreferences'),'Missing localized UI on '+name);
}
const files=['apps/web/components/BookOverview.tsx','apps/web/components/ChapterComments.tsx',
 'apps/web/components/SnapshotsPanel.tsx','apps/web/components/SearchClient.tsx',
 'apps/web/components/ArchivesClient.tsx','apps/web/components/LoginForm.tsx'];
for(const file of files)assert.ok(load(file).includes('useAppPreferences'),'i18n missing '+file);
console.log('Preferences: FR/EN, system/light/dark and server cookie contracts OK.');
