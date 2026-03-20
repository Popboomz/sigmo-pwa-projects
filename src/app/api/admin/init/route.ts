import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Deprecated endpoint. Use /admin/init to create Firebase-backed admin users.',
    },
    { status: 410 }
  );
}
