import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/app/api/middleware';
import {
  canBootstrapAdminSetup,
  createOrUpdateFirebaseEmailUser,
  normalizeEmail,
  setAdminAccess,
} from '@/lib/admin-auth';

function getFirebaseUserWriteError(error: unknown): { status: number; message: string } {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  if (
    code === 'auth/invalid-email' ||
    code === 'auth/invalid-password' ||
    code === 'auth/email-already-exists' ||
    code === 'auth/password-does-not-meet-requirements'
  ) {
    return { status: 400, message: 'Invalid email or password' };
  }

  return { status: 500, message: 'Failed to create Firebase user' };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      name?: unknown;
      isAdmin?: unknown;
    };

    const normalizedEmail =
      typeof body.email === 'string' ? normalizeEmail(body.email) : '';
    const password =
      typeof body.password === 'string' ? body.password.trim() : '';
    const name =
      typeof body.name === 'string' && body.name.trim() ? body.name.trim() : undefined;
    const shouldGrantAdmin = body.isAdmin !== false;

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const bootstrapAllowed = await canBootstrapAdminSetup();
    let grantedByEmail: string | null | undefined = 'bootstrap';

    if (!bootstrapAllowed) {
      const adminCheck = await verifyAdmin(request);
      if (!adminCheck.success) {
        return NextResponse.json(
          { error: adminCheck.error || 'Only admin can manage admin users' },
          { status: adminCheck.error === 'Unauthorized' ? 401 : 403 }
        );
      }
      grantedByEmail = adminCheck.email;
    } else if (!shouldGrantAdmin) {
      return NextResponse.json(
        { error: 'The first managed account must be an admin' },
        { status: 400 }
      );
    }

    let firebaseUser;
    try {
      firebaseUser = await createOrUpdateFirebaseEmailUser({
        email: normalizedEmail,
        password,
        name,
      });
    } catch (error) {
      const mapped = getFirebaseUserWriteError(error);
      return NextResponse.json(
        { error: mapped.message },
        { status: mapped.status }
      );
    }

    const adminUser = await setAdminAccess({
      email: normalizedEmail,
      uid: firebaseUser.uid,
      name: firebaseUser.name ?? name,
      isAdmin: shouldGrantAdmin,
      grantedByEmail,
      source: bootstrapAllowed ? 'bootstrap' : 'directory',
    });

    return NextResponse.json({
      success: true,
      message: firebaseUser.created
        ? 'Firebase user created successfully'
        : 'Firebase user updated successfully',
      user: {
        id: adminUser.uid ?? firebaseUser.uid,
        email: adminUser.email,
        name: adminUser.name ?? firebaseUser.name ?? normalizedEmail,
        isAdmin: adminUser.isAdmin,
      },
    });
  } catch (error) {
    console.error('Init user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const bootstrapAllowed = await canBootstrapAdminSetup();
    if (bootstrapAllowed) {
      return NextResponse.json({
        success: true,
        bootstrapAllowed: true,
      });
    }

    const adminCheck = await verifyAdmin(request);

    return NextResponse.json({
      success: adminCheck.success,
      bootstrapAllowed: false,
      requiresAdmin: true,
      email: adminCheck.email ?? null,
    });
  } catch (error) {
    console.error('Init user status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
