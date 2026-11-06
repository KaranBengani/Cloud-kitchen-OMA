import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json holds the production app. APP_VARIANT=staging (set by the "preview" EAS profile)
// turns it into a separate "Mummy's Kitchen (Test)" app: its own package id so it installs
// next to the real one, and a grey icon so the two can't be mixed up. It talks to the staging
// API and database, so testing never touches real orders.
const STAGING = process.env.APP_VARIANT === 'staging';

// Firebase's Android config, needed for push notifications (DECISIONS.md D20). An EAS "file" environment
// variable, so it stays out of git; one file covers both package ids. Local dev builds work without it,
// they just get no push token.
const GOOGLE_SERVICES_JSON = process.env.GOOGLE_SERVICES_JSON;

export default ({ config: appJson }: ConfigContext): ExpoConfig => {
  const config: ExpoConfig = GOOGLE_SERVICES_JSON
    ? { ...(appJson as ExpoConfig), android: { ...appJson.android, googleServicesFile: GOOGLE_SERVICES_JSON } }
    : (appJson as ExpoConfig);
  if (!STAGING) return config;
  return {
    ...config,
    name: "Mummy's Kitchen (Test)",
    slug: config.slug!,
    scheme: 'oma-stg',
    icon: './assets/images/icon-staging.png',
    android: {
      ...config.android,
      package: 'com.karanbengani.oma.stg',
      adaptiveIcon: {
        ...config.android?.adaptiveIcon,
        backgroundColor: '#6B6B6B',
        foregroundImage: './assets/images/android-icon-foreground-staging.png',
      },
    },
  };
};
