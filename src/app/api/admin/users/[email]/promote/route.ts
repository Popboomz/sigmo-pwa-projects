import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';
import { userManager } from '@/storage/database';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ email: string }> }
) {
  try {
    const params = await context.params;
    const targetEmail = params.email;

    // 验证请求者是管理员
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.isAdmin) {
      return NextResponse.json(
        { error: 'Only admin can promote users' },
        { status: 403 }
      );
    }

    // 检查目标用户是否存在
    const targetUser = await userManager.getUserByEmail(targetEmail);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 升级为管理员
    const updatedUser = await userManager.updateUser(targetUser.id, {
      isAdmin: true,
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to promote user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
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
