import { NextRequest, NextResponse } from 'next/server';
import { userManager } from '@/storage/database';
import { hashPassword } from '@/lib/auth';

// 默认管理员账号
const DEFAULT_ADMIN = {
  email: 'sigmo@gmail.com',
  password: '0130',
  name: 'Admin',
};

export async function POST(request: NextRequest) {
  try {
    // 检查sigmo用户是否已存在
    const existingUser = await userManager.getUserByEmail(DEFAULT_ADMIN.email);
    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Admin user already exists',
      });
    }

    // 创建默认管理员用户
    const user = await userManager.createUser({
      email: DEFAULT_ADMIN.email,
      password: await hashPassword(DEFAULT_ADMIN.password),
      name: DEFAULT_ADMIN.name,
      isAdmin: true,
      provider: 'email',
    });

    return NextResponse.json({
      success: true,
      message: 'Default admin user created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
