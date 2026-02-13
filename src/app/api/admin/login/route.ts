import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { isAdminEmailAllowed, verifyFirebaseIdToken } from '@/lib/admin-auth';

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

  const idToken = extractIdToken(request, body);
  if (!idToken) {
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

  if (!isAdminEmailAllowed(email)) {
    return NextResponse.json(
      { error: 'No admin permission' },
      { status: 403 }
    );
  }

  const token = generateToken({
    userId: verified.user.uid,
    email,
    isAdmin: true,
  });

  return NextResponse.json({
    ok: true,
    success: true,
    token,
    user: {
      id: verified.user.uid,
      email,
      name: verified.user.name ?? email,
      isAdmin: true,
    },
  });
}
