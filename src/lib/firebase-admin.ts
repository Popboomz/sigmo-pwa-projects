import 'server-only';

import { applicationDefault, cert, getApps, initializeApp, type App, type AppOptions } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let cachedApp: App | null = null;

function getProjectIdFromFirebaseConfig(): string | null {
  const rawConfig = process.env.FIREBASE_CONFIG;
  if (!rawConfig || !rawConfig.trim().startsWith('{')) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawConfig) as { projectId?: unknown };
    return typeof parsed.projectId === 'string' && parsed.projectId.trim()
      ? parsed.projectId.trim()
      : null;
  } catch {
    return null;
  }
}

function getFirebaseProjectId(): string | null {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    getProjectIdFromFirebaseConfig()
  ) ?? null;
}

function getFirebaseAdminOptions(): AppOptions {
  const projectId = getFirebaseProjectId();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    };
  }

  return {
    ...(projectId ? { projectId } : {}),
    credential: applicationDefault(),
  };
}

export function getFirebaseAdminApp(): App {
  if (cachedApp) {
    return cachedApp;
  }

  const existingApp = getApps()[0];
  if (existingApp) {
    cachedApp = existingApp;
    return existingApp;
  }

  cachedApp = initializeApp(getFirebaseAdminOptions());
  return cachedApp;
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminDb(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}
