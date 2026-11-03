'use client';
import ActionMenu from './ActionMenu';
import {useAppPreferences,usePreferenceActions} from './AppPreferences';

/** A single secondary entry point for display choices on public screens. */
export default function DisplayPreferencesMenu(){
  const {t}=useAppPreferences();
  return <ActionMenu label={t('prefs.display')} actions={usePreferenceActions()} className="preferences-actions"/>;
}
