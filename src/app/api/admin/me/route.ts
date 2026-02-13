import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';
import { isAdminEmailAllowed } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const token = extractTokenFromRequest(request);
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }

  if (!payload.email || !payload.isAdmin || !isAdminEmailAllowed(payload.email)) {
    return NextResponse.json(
      { error: 'No admin permission' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: payload.userId,
      email: payload.email,
      name: payload.email,
      isAdmin: true,
    },
  });
}
