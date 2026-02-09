import { NextRequest, NextResponse } from 'next/server';
import { protocolManager } from '@/storage/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params;

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link is required' },
        { status: 400 }
      );
    }

    const protocol = await protocolManager.getProtocolByShareLink(shareLink);

    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: protocol,
    });
  } catch (error) {
    console.error('Get protocol error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
