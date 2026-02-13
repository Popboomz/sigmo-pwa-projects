interface FirebaseLookupUser {
  localId?: string;
  email?: string;
  displayName?: string;
}

interface FirebaseLookupSuccessResponse {
  users?: FirebaseLookupUser[];
}

interface FirebaseLookupErrorResponse {
  error?: {
    message?: string;
  };
}

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
  name?: string;
}

export interface VerifyFirebaseTokenResult {
  ok: boolean;
  status: number;
  error?: string;
  user?: VerifiedFirebaseUser;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getFirebaseApiKey(): string | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return null;
  }
  return apiKey;
}

function getFirebaseLookupUrl(apiKey: string): string {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === '1') {
    return `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
  }

  return `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
}

function getFirebaseLookupErrorMessage(message?: string): { status: number; error: string } {
  if (!message) {
    return { status: 401, error: 'Invalid Firebase ID token' };
  }

  if (message.includes('INVALID_ID_TOKEN') || message.includes('EXPIRED_ID_TOKEN')) {
    return { status: 401, error: 'Invalid Firebase ID token' };
  }

  if (message.includes('USER_DISABLED')) {
    return { status: 403, error: 'Firebase user is disabled' };
  }

  return { status: 401, error: 'Unable to verify Firebase ID token' };
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifyFirebaseTokenResult> {
  const apiKey = getFirebaseApiKey();
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      error: 'Firebase API key is not configured',
    };
  }

  try {
    const response = await fetch(getFirebaseLookupUrl(apiKey), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
      cache: 'no-store',
    });

    if (!response.ok) {
      let message: string | undefined;
      try {
        const errorPayload = (await response.json()) as FirebaseLookupErrorResponse;
        message = errorPayload.error?.message;
      } catch {
        message = undefined;
      }

      const mapped = getFirebaseLookupErrorMessage(message);
      return {
        ok: false,
        status: mapped.status,
        error: mapped.error,
      };
    }

    const payload = (await response.json()) as FirebaseLookupSuccessResponse;
    const user = payload.users?.[0];

    if (!user?.localId) {
      return {
        ok: false,
        status: 401,
        error: 'Invalid Firebase ID token',
      };
    }

    return {
      ok: true,
      status: 200,
      user: {
        uid: user.localId,
        email: typeof user.email === 'string' ? normalizeEmail(user.email) : undefined,
        name: typeof user.displayName === 'string' ? user.displayName : undefined,
      },
    };
  } catch {
    return {
      ok: false,
      status: 503,
      error: 'Unable to verify Firebase ID token',
    };
  }
}

export function getAdminEmailAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAIL_ALLOWLIST ?? '';
  return new Set(
    raw
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmailAllowed(email: string): boolean {
  if (!email) {
    return false;
  }

  const allowlist = getAdminEmailAllowlist();
  if (allowlist.size === 0) {
    return false;
  }

  return allowlist.has(normalizeEmail(email));
}

