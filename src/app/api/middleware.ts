import { NextRequest } from 'next/server';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';

export async function verifyAdmin(request: NextRequest): Promise<{ success: boolean; userId?: string; error?: string }> {
  const token = extractTokenFromRequest(request);
  if (!token) {
    return { success: false, error: 'Unauthorized' };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { success: false, error: 'Invalid token' };
  }

  if (!payload.isAdmin) {
    return { success: false, error: 'No admin permission' };
  }

  return { success: true, userId: payload.userId };
}
