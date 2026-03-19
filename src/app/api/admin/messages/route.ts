import { NextRequest, NextResponse } from 'next/server';
import { messageManager } from '@/storage/database';
import { isLocalDevDatabaseFallbackEnabled } from '@/lib/local-dev-db';
import { createLocalMessage, listLocalMessages } from '@/lib/local-admin-store';

export async function GET() {
  try {
    if (isLocalDevDatabaseFallbackEnabled()) {
      const allMessages = await listLocalMessages();

      return NextResponse.json({
        success: true,
        data: allMessages,
        source: 'local-dev-store',
      });
    }

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authorName, content, createdBy } = body;

    if (!authorName || !content) {
      return NextResponse.json(
        {
          success: false,
          error: 'authorName and content are required',
        },
        { status: 400 }
      );
    }

    if (isLocalDevDatabaseFallbackEnabled()) {
      const newMessage = await createLocalMessage({
        authorName,
        content,
        createdBy: createdBy || null,
      });

      return NextResponse.json({
        success: true,
        data: newMessage,
        source: 'local-dev-store',
      });
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
