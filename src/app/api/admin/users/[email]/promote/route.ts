import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/app/api/middleware';
import { getFirebaseAdminAuth } from '@/lib/firebase-admin';
import { normalizeEmail, setAdminAccess } from '@/lib/admin-auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ email: string }> }
) {
  try {
    const adminCheck = await verifyAdmin(request);
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || 'Only admin can promote users' },
        { status: adminCheck.error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const params = await context.params;
    const targetEmail = normalizeEmail(decodeURIComponent(params.email || ''));
    if (!targetEmail) {
      return NextResponse.json(
        { error: 'Target email is required' },
        { status: 400 }
      );
    }

    let targetUser;
    try {
      targetUser = await getFirebaseAdminAuth().getUserByEmail(targetEmail);
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code ?? '')
          : '';

      if (code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      throw error;
    }

    const updatedUser = await setAdminAccess({
      email: targetEmail,
      uid: targetUser.uid,
      name: targetUser.displayName ?? undefined,
      isAdmin: true,
      grantedByEmail: adminCheck.email,
      source: 'directory',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.uid ?? targetUser.uid,
        email: updatedUser.email,
        name: updatedUser.name ?? targetUser.displayName ?? targetEmail,
        isAdmin: updatedUser.isAdmin,
      },
    });
  } catch (error) {
    console.error('Promote user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
