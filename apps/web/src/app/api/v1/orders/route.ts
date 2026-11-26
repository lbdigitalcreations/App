import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([]);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json({
      id: 'ord_' + Date.now(),
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
      ...body,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
  }
}
