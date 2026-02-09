import { NextRequest, NextResponse } from 'next/server';
import { messageManager } from '@/storage/database';

// DELETE - 删除留言
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deletedMessage = await messageManager.deleteMessage(id);

    if (!deletedMessage) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deletedMessage,
    });
  } catch (error) {
    console.error('Failed to delete message:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete message',
      },
      { status: 500 }
    );
  }
}
