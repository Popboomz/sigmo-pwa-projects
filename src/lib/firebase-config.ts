const FIREBASE_ENV_KEYS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

const PLACEHOLDER_PATTERNS = [
  /^your_/i,
  /^dev-/i,
  /^demo-/i,
  /^change-me/i,
  /^example/i,
  /dummy/i,
  /firebaseapp\.com$/i,
  /appspot\.com$/i,
  /^1:1234567890:web:/i,
] as const;

function isMeaningfulFirebaseValue(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isFirebaseEmulatorEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === '1';
}

export function isFirebaseClientConfigured(): boolean {
  if (isFirebaseEmulatorEnabled()) {
    return true;
  }

  return FIREBASE_ENV_KEYS.every((key) =>
    isMeaningfulFirebaseValue(process.env[key])
  );
}

export function isLocalDevAdminLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    !isFirebaseClientConfigured() &&
    Boolean(process.env.DEV_ADMIN_EMAIL?.trim()) &&
    Boolean(process.env.DEV_ADMIN_PASSWORD?.trim())
  );
}
