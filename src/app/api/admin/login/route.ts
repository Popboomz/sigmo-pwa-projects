import { NextRequest, NextResponse } from 'next/server';
import { userManager } from '@/storage/database';
import { hashPassword, generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, provider } = body;

    if (!email || !provider) {
      return NextResponse.json(
        { error: 'Email and provider are required' },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await userManager.getUserByEmail(email);

    // 邮箱密码登录
    if (provider === 'email') {
      if (!password) {
        return NextResponse.json(
          { error: 'Password is required' },
          { status: 400 }
        );
      }

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        );
      }

      // 验证密码
      if (!user.password || !(await bcrypt.compare(password, user.password))) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
    } else if (provider === 'google') {
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // 检查是否是管理员
    console.log('User object:', JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      isAdminType: typeof user.isAdmin,
      isAdminValue: user.isAdmin ? 'true' : 'false'
    }));

    if (!user.isAdmin) {
      console.error('Admin permission check failed. User isAdmin:', user.isAdmin);
      return NextResponse.json(
        { error: 'No admin permission' },
        { status: 403 }
      );
    }

    console.log('Admin permission check passed. User is admin:', user.isAdmin);

    // 生成 JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
