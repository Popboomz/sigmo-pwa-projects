import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase-admin';

const ADMIN_USERS_COLLECTION = 'adminUsers';

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
  claimsAdmin?: boolean;
}

export interface VerifyFirebaseTokenResult {
  ok: boolean;
  status: number;
  error?: string;
  user?: VerifiedFirebaseUser;
}

export interface AdminDirectoryEntry {
  email: string;
  uid?: string;
  name?: string;
  isAdmin: boolean;
  source: string;
}

export interface AdminAccessResult {
  allowed: boolean;
  source: 'directory' | 'custom-claim' | 'allowlist' | 'none';
  reason?: string;
  entry?: AdminDirectoryEntry | null;
}

export interface SetAdminAccessInput {
  email: string;
  uid?: string | null;
  name?: string | null;
  isAdmin: boolean;
  grantedByEmail?: string | null;
  source?: string;
}

export interface UpsertFirebaseEmailUserInput {
  email: string;
  password: string;
  name?: string | null;
}

export function normalizeEmail(email: string): string {
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

  if (
    message.includes('INVALID_ID_TOKEN') ||
    message.includes('EXPIRED_ID_TOKEN') ||
    message.includes('TOKEN_EXPIRED')
  ) {
    return { status: 401, error: 'Invalid Firebase ID token' };
  }

  if (message.includes('USER_DISABLED')) {
    return { status: 403, error: 'Firebase user is disabled' };
  }

  return { status: 401, error: 'Unable to verify Firebase ID token' };
}

function getFirebaseAdminErrorMessage(error: unknown): { status: number; error: string } {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  if (
    code === 'auth/invalid-id-token' ||
    code === 'auth/id-token-expired' ||
    code === 'auth/id-token-revoked' ||
    code === 'auth/argument-error'
  ) {
    return { status: 401, error: 'Invalid Firebase ID token' };
  }

  if (code === 'auth/user-disabled') {
    return { status: 403, error: 'Firebase user is disabled' };
  }

  return { status: 503, error: 'Unable to verify Firebase ID token' };
}

async function verifyFirebaseIdTokenWithAdmin(idToken: string): Promise<VerifyFirebaseTokenResult> {
  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken, true);
    return {
      ok: true,
      status: 200,
      user: {
        uid: decoded.uid,
        email: typeof decoded.email === 'string' ? normalizeEmail(decoded.email) : undefined,
        name: typeof decoded.name === 'string' ? decoded.name : undefined,
        claimsAdmin: decoded.admin === true,
      },
    };
  } catch (error) {
    const mapped = getFirebaseAdminErrorMessage(error);
    return {
      ok: false,
      status: mapped.status,
      error: mapped.error,
    };
  }
}

async function verifyFirebaseIdTokenWithLookup(idToken: string): Promise<VerifyFirebaseTokenResult> {
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
        claimsAdmin: false,
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

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifyFirebaseTokenResult> {
  const verifiedWithAdmin = await verifyFirebaseIdTokenWithAdmin(idToken);
  if (verifiedWithAdmin.ok || verifiedWithAdmin.status !== 503) {
    return verifiedWithAdmin;
  }

  return verifyFirebaseIdTokenWithLookup(idToken);
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

  return getAdminEmailAllowlist().has(normalizeEmail(email));
}

function getAdminDirectoryDoc(email: string) {
  return getFirebaseAdminDb().collection(ADMIN_USERS_COLLECTION).doc(normalizeEmail(email));
}

async function getFirebaseUserByEmail(email: string) {
  try {
    return await getFirebaseAdminAuth().getUserByEmail(normalizeEmail(email));
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';

    if (code === 'auth/user-not-found') {
      return null;
    }

    throw error;
  }
}

function mapAdminDirectoryEntry(data: Record<string, unknown>, fallbackEmail: string): AdminDirectoryEntry {
  return {
    email:
      typeof data.email === 'string' && data.email.trim()
        ? normalizeEmail(data.email)
        : normalizeEmail(fallbackEmail),
    uid: typeof data.uid === 'string' && data.uid.trim() ? data.uid.trim() : undefined,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : undefined,
    isAdmin: data.isAdmin === true,
    source: typeof data.source === 'string' && data.source.trim() ? data.source.trim() : 'directory',
  };
}

export async function getAdminDirectoryEntry(email: string): Promise<AdminDirectoryEntry | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  try {
    const snapshot = await getAdminDirectoryDoc(normalizedEmail).get();
    if (!snapshot.exists) {
      return null;
    }

    return mapAdminDirectoryEntry(
      (snapshot.data() ?? {}) as Record<string, unknown>,
      normalizedEmail
    );
  } catch {
    return null;
  }
}

async function syncFirebaseAdminClaim(uid: string | null | undefined, isAdmin: boolean): Promise<void> {
  if (!uid) {
    return;
  }

  try {
    const auth = getFirebaseAdminAuth();
    const user = await auth.getUser(uid);
    const nextClaims = { ...(user.customClaims ?? {}) } as Record<string, unknown>;

    if (isAdmin) {
      nextClaims.admin = true;
    } else {
      delete nextClaims.admin;
    }

    await auth.setCustomUserClaims(uid, nextClaims);
  } catch (error) {
    console.warn('Failed to sync Firebase admin claim:', error);
  }
}

async function upsertAdminDirectoryEntry(input: SetAdminAccessInput): Promise<void> {
  const normalizedEmail = normalizeEmail(input.email);
  if (!normalizedEmail) {
    throw new Error('Admin email is required');
  }

  const snapshot = await getAdminDirectoryDoc(normalizedEmail).get();
  const existing = snapshot.exists
    ? ((snapshot.data() ?? {}) as Record<string, unknown>)
    : null;

  const payload = {
    email: normalizedEmail,
    uid:
      input.uid?.trim() ||
      (typeof existing?.uid === 'string' && existing.uid.trim() ? existing.uid.trim() : null),
    name:
      input.name?.trim() ||
      (typeof existing?.name === 'string' && existing.name.trim() ? existing.name.trim() : null),
    isAdmin: input.isAdmin,
    source: input.source?.trim() || (typeof existing?.source === 'string' ? existing.source : 'directory'),
    grantedByEmail: input.grantedByEmail ? normalizeEmail(input.grantedByEmail) : null,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: existing ? existing.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
  };

  await getAdminDirectoryDoc(normalizedEmail).set(payload, { merge: true });
}

async function migrateAdminAccessIfNeeded(input: {
  email: string;
  uid?: string | null;
  name?: string | null;
  source: 'directory' | 'custom-claim' | 'allowlist';
}) {
  if (input.source !== 'directory') {
    try {
      await upsertAdminDirectoryEntry({
        email: input.email,
        uid: input.uid,
        name: input.name,
        isAdmin: true,
        source: input.source,
      });
    } catch (error) {
      console.warn('Failed to migrate admin access into Firestore:', error);
    }
  }

  await syncFirebaseAdminClaim(input.uid, true);
}

export async function resolveAdminAccess(input: {
  email?: string | null;
  uid?: string | null;
  name?: string | null;
  claimsAdmin?: boolean | null;
}): Promise<AdminAccessResult> {
  const normalizedEmail = normalizeEmail(input.email ?? '');
  if (!normalizedEmail) {
    return {
      allowed: false,
      source: 'none',
      reason: 'missing-email',
    };
  }

  const directoryEntry = await getAdminDirectoryEntry(normalizedEmail);
  if (directoryEntry) {
    if (!directoryEntry.isAdmin) {
      await syncFirebaseAdminClaim(input.uid, false);
      return {
        allowed: false,
        source: 'directory',
        reason: 'revoked',
        entry: directoryEntry,
      };
    }

    await migrateAdminAccessIfNeeded({
      email: normalizedEmail,
      uid: input.uid ?? directoryEntry.uid,
      name: input.name ?? directoryEntry.name,
      source: 'directory',
    });

    return {
      allowed: true,
      source: 'directory',
      entry: directoryEntry,
    };
  }

  if (input.claimsAdmin) {
    await migrateAdminAccessIfNeeded({
      email: normalizedEmail,
      uid: input.uid,
      name: input.name,
      source: 'custom-claim',
    });

    return {
      allowed: true,
      source: 'custom-claim',
    };
  }

  if (isAdminEmailAllowed(normalizedEmail)) {
    await migrateAdminAccessIfNeeded({
      email: normalizedEmail,
      uid: input.uid,
      name: input.name,
      source: 'allowlist',
    });

    return {
      allowed: true,
      source: 'allowlist',
    };
  }

  return {
    allowed: false,
    source: 'none',
    reason: 'not-granted',
  };
}

export async function hasAnyManagedAdmins(): Promise<boolean> {
  try {
    const snapshot = await getFirebaseAdminDb().collection(ADMIN_USERS_COLLECTION).limit(1).get();
    return !snapshot.empty;
  } catch {
    return false;
  }
}

export async function canBootstrapAdminSetup(): Promise<boolean> {
  if (getAdminEmailAllowlist().size > 0) {
    return false;
  }

  return !(await hasAnyManagedAdmins());
}

export async function setAdminAccess(input: SetAdminAccessInput): Promise<AdminDirectoryEntry> {
  const normalizedEmail = normalizeEmail(input.email);
  if (!normalizedEmail) {
    throw new Error('Admin email is required');
  }

  let resolvedUid = input.uid?.trim() || undefined;
  let resolvedName = input.name?.trim() || undefined;

  if (!resolvedUid || !resolvedName) {
    const existingUser = await getFirebaseUserByEmail(normalizedEmail);
    if (existingUser) {
      resolvedUid = resolvedUid ?? existingUser.uid;
      resolvedName = resolvedName ?? existingUser.displayName ?? undefined;
    }
  }

  await upsertAdminDirectoryEntry({
    ...input,
    email: normalizedEmail,
    uid: resolvedUid,
    name: resolvedName,
  });

  await syncFirebaseAdminClaim(resolvedUid, input.isAdmin);

  return {
    email: normalizedEmail,
    uid: resolvedUid,
    name: resolvedName,
    isAdmin: input.isAdmin,
    source: input.source?.trim() || 'directory',
  };
}

export async function createOrUpdateFirebaseEmailUser(
  input: UpsertFirebaseEmailUserInput
): Promise<{ uid: string; email: string; name?: string; created: boolean }> {
  const auth = getFirebaseAdminAuth();
  const normalizedEmail = normalizeEmail(input.email);
  const displayName = input.name?.trim() || undefined;

  const existingUser = await getFirebaseUserByEmail(normalizedEmail);

  if (existingUser) {
    const updatedUser = await auth.updateUser(existingUser.uid, {
      email: normalizedEmail,
      password: input.password,
      displayName: displayName ?? existingUser.displayName ?? undefined,
      disabled: false,
    });

    return {
      uid: updatedUser.uid,
      email: normalizeEmail(updatedUser.email ?? normalizedEmail),
      name: updatedUser.displayName ?? undefined,
      created: false,
    };
  }

  const createdUser = await auth.createUser({
    email: normalizedEmail,
    password: input.password,
    displayName,
    disabled: false,
  });

  return {
    uid: createdUser.uid,
    email: normalizeEmail(createdUser.email ?? normalizedEmail),
    name: createdUser.displayName ?? undefined,
    created: true,
  };
}
