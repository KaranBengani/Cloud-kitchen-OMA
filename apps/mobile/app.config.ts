import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json holds the production app. APP_VARIANT=staging (set by the "preview" EAS profile)
// turns it into a separate "Mummy's Kitchen (Test)" app: its own package id so it installs
// next to the real one, and a grey icon so the two can't be mixed up. It talks to the staging
// API and database, so testing never touches real orders.
const STAGING = process.env.APP_VARIANT === 'staging';

export default ({ config }: ConfigContext): ExpoConfig => {
  if (!STAGING) return config as ExpoConfig;
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
