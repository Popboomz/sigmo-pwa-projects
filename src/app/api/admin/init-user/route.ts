import { NextRequest, NextResponse } from 'next/server';
import { userManager } from '@/storage/database';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, isAdmin } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // 检查用户是否已存在
    const existingUser = await userManager.getUserByEmail(email);

    if (existingUser) {
      // 更新现有用户
      const updatedUser = await userManager.updateUser(existingUser.id, {
        isAdmin: isAdmin !== undefined ? isAdmin : existingUser.isAdmin,
        password: await bcrypt.hash(password, 10),
        name: name || existingUser.name,
      });

      return NextResponse.json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: updatedUser?.id,
          email: updatedUser?.email,
          name: updatedUser?.name,
          isAdmin: updatedUser?.isAdmin,
        },
      });
    }

    // 创建新用户
    const newUser = await userManager.createUser({
      email,
      name: name || 'Admin',
      password: await bcrypt.hash(password, 10),
      isAdmin: isAdmin !== undefined ? isAdmin : true,
      provider: 'email',
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        isAdmin: newUser.isAdmin,
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
