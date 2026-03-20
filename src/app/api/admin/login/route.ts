import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { normalizeEmail, resolveAdminAccess, verifyFirebaseIdToken } from '@/lib/admin-auth';
import { isLocalDevAdminLoginEnabled } from '@/lib/firebase-config';

function extractIdToken(request: NextRequest, body: unknown): string | null {
  if (typeof body === 'object' && body !== null && 'idToken' in body) {
    const bodyToken = (body as { idToken?: unknown }).idToken;
    if (typeof bodyToken === 'string' && bodyToken.trim()) {
      return bodyToken.trim();
    }
  }

  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    const headerToken = authorization.slice(7).trim();
    if (headerToken) {
      return headerToken;
    }
  }

  return null;
}

function extractEmailPassword(body: unknown): { email: string; password: string } | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const email = 'email' in body ? (body as { email?: unknown }).email : null;
  const password = 'password' in body ? (body as { password?: unknown }).password : null;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password.trim()) {
    return null;
  }

  return {
    email: normalizedEmail,
    password,
  };
}

function buildAdminResponse(email: string, userId: string, name?: string) {
  const token = generateToken({
    userId,
    email,
    isAdmin: true,
  });

  return NextResponse.json({
    ok: true,
    success: true,
    token,
    user: {
      id: userId,
      email,
      name: name || email,
      isAdmin: true,
    },
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const emailPassword = extractEmailPassword(body);
  if (emailPassword && isLocalDevAdminLoginEnabled()) {
    const expectedEmail = normalizeEmail(process.env.DEV_ADMIN_EMAIL || '');
    const expectedPassword = process.env.DEV_ADMIN_PASSWORD || '';

    if (emailPassword.email !== expectedEmail || emailPassword.password !== expectedPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    return buildAdminResponse(emailPassword.email, 'local-dev-admin');
  }

  const idToken = extractIdToken(request, body);
  if (!idToken) {
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json(
        { error: 'Firebase is not configured for local development. Use the configured local admin credentials instead.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'idToken is required' },
      { status: 400 }
    );
  }

  const verified = await verifyFirebaseIdToken(idToken);
  if (!verified.ok || !verified.user) {
    return NextResponse.json(
      { error: verified.error ?? 'Unable to verify Firebase ID token' },
      { status: verified.status || 401 }
    );
  }

  const email = verified.user.email;
  if (!email) {
    return NextResponse.json(
      { error: 'Admin email is required' },
      { status: 403 }
    );
  }

  const access = await resolveAdminAccess({
    email,
    uid: verified.user.uid,
    name: verified.user.name,
    claimsAdmin: verified.user.claimsAdmin,
  });

  if (!access.allowed) {
    return NextResponse.json(
      { error: 'No admin permission' },
      { status: 403 }
    );
  }

  return buildAdminResponse(email, verified.user.uid, verified.user.name);
}
