import { NextRequest } from 'next/server';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';
import { resolveAdminAccess } from '@/lib/admin-auth';

export async function verifyAdmin(
  request: NextRequest
): Promise<{ success: boolean; userId?: string; email?: string; error?: string }> {
  const token = extractTokenFromRequest(request);
  if (!token) {
    return { success: false, error: 'Unauthorized' };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { success: false, error: 'Invalid token' };
  }

  if (!payload.isAdmin || !payload.email) {
    return { success: false, error: 'No admin permission' };
  }

  const access = await resolveAdminAccess({
    email: payload.email,
    uid: payload.userId,
  });

  if (!access.allowed) {
    return { success: false, error: 'No admin permission' };
  }

  return { success: true, userId: payload.userId, email: payload.email };
}
