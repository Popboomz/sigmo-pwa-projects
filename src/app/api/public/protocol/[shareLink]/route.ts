import { NextRequest, NextResponse } from 'next/server';
import { protocolManager } from '@/storage/database';
import { isLocalDevDatabaseFallbackEnabled } from '@/lib/local-dev-db';
import { getLocalProtocolByShareLink } from '@/lib/local-admin-store';

export async function GET(
  _request: NextRequest,
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

    if (isLocalDevDatabaseFallbackEnabled()) {
      const protocol = await getLocalProtocolByShareLink(shareLink);

      if (!protocol) {
        return NextResponse.json(
          { error: 'Protocol not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: protocol,
        source: 'local-dev-store',
      });
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
