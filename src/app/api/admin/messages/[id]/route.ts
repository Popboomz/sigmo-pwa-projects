import { NextRequest, NextResponse } from 'next/server';
import { messageManager } from '@/storage/database';
import { isLocalDevDatabaseFallbackEnabled } from '@/lib/local-dev-db';
import { deleteLocalMessage } from '@/lib/local-admin-store';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isLocalDevDatabaseFallbackEnabled()) {
      const deletedMessage = await deleteLocalMessage(id);

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
        source: 'local-dev-store',
      });
    }

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
