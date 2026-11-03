import pkg from '../package.json';

export const APP_VERSION = pkg.version;
export const APP_CHANNEL = 'alpha' as const;
export const APP_TAG = 'v' + APP_VERSION;
