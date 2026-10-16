// Runs in the "store build" GitHub workflow before EAS.
// Moves secrets from GitHub into the places EAS reads them, and says what is missing.
import fs from 'node:fs';
import path from 'node:path';

const env = process.env;
const platform = env.PLATFORM || 'all';
const wants = (p) => platform === 'all' || platform === p;
const out = [];
const errors = [];

const easPath = 'eas.json';
const eas = JSON.parse(fs.readFileSync(easPath, 'utf8'));
const prod = eas.build.production;

// RevenueCat keys are public SDK keys: they end up inside the app anyway.
prod.env = { ...(prod.env ?? {}) };
if (env.REVENUECAT_IOS_KEY) prod.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = env.REVENUECAT_IOS_KEY.trim();
if (env.REVENUECAT_ANDROID_KEY) prod.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = env.REVENUECAT_ANDROID_KEY.trim();
if (wants('ios') && !env.REVENUECAT_IOS_KEY) errors.push('REVENUECAT_IOS_KEY (ключ appl_… з RevenueCat)');
if (wants('android') && !env.REVENUECAT_ANDROID_KEY) errors.push('REVENUECAT_ANDROID_KEY (ключ goog_… з RevenueCat)');
if (!env.EXPO_TOKEN) errors.push('EXPO_TOKEN (токен з expo.dev, Access tokens)');

eas.submit ??= {};
eas.submit.production ??= {};
const submit = eas.submit.production;

// App Store Connect API key: lets EAS fix iOS certificates on CI and upload to TestFlight.
const asc = env.ASC_API_KEY_P8 && env.ASC_KEY_ID && env.ASC_ISSUER_ID;
if (asc) {
  const keyPath = path.resolve('asc-api-key.p8');
  fs.writeFileSync(keyPath, env.ASC_API_KEY_P8.replace(/\\n/g, '\n').trim() + '\n', { mode: 0o600 });
  out.push(`EXPO_ASC_API_KEY_PATH=${keyPath}`, `EXPO_ASC_KEY_ID=${env.ASC_KEY_ID.trim()}`, `EXPO_ASC_ISSUER_ID=${env.ASC_ISSUER_ID.trim()}`);
  if (env.APPLE_TEAM_ID) out.push(`EXPO_APPLE_TEAM_ID=${env.APPLE_TEAM_ID.trim()}`, `EXPO_APPLE_TEAM_TYPE=INDIVIDUAL`);
  if (env.ASC_APP_ID) {
    submit.ios = {
      ascAppId: env.ASC_APP_ID.trim(),
      ascApiKeyPath: './asc-api-key.p8',
      ascApiKeyIssuerId: env.ASC_ISSUER_ID.trim(),
      ascApiKeyId: env.ASC_KEY_ID.trim(),
    };
    out.push('CAN_SUBMIT_IOS=1');
  }
}

// Google Play service account: uploads new versions after the very first one, which goes by hand.
if (env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  fs.writeFileSync('google-service-account.json', env.GOOGLE_SERVICE_ACCOUNT_JSON, { mode: 0o600 });
  submit.android = { serviceAccountKeyPath: './google-service-account.json', track: 'internal', releaseStatus: 'draft' };
  out.push('CAN_SUBMIT_ANDROID=1');
}

fs.writeFileSync(easPath, JSON.stringify(eas, null, 2) + '\n');
if (env.GITHUB_ENV) fs.appendFileSync(env.GITHUB_ENV, out.map((l) => l + '\n').join(''));

if (errors.length) {
  console.log(`::error title=Не вистачає секретів::Додайте в GitHub, Settings, Secrets and variables, Actions: ${errors.join(', ')}. Покроково в PUBLISHING.md.`);
  process.exit(1);
}
console.log('Готово:', out.map((l) => l.split('=')[0]).join(', ') || 'тільки збірка');
