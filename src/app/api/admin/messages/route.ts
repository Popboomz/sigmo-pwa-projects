import { NextRequest, NextResponse } from 'next/server';
import { messageManager } from '@/storage/database';

// GET - 获取所有留言
export async function GET() {
  try {
    const allMessages = await messageManager.getAllMessages();

    return NextResponse.json({
      success: true,
      data: allMessages,
    });
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch messages',
      },
      { status: 500 }
    );
  }
}

// POST - 创建新留言
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authorName, content, createdBy } = body;

    // 验证输入
    if (!authorName || !content) {
      return NextResponse.json(
        {
          success: false,
          error: 'authorName and content are required',
        },
        { status: 400 }
      );
    }

    const newMessage = await messageManager.createMessage({
      authorName,
      content,
      createdBy: createdBy || null,
    });

    return NextResponse.json({
      success: true,
      data: newMessage,
    });
  } catch (error) {
    console.error('Failed to create message:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create message',
      },
      { status: 500 }
    );
  }
}
