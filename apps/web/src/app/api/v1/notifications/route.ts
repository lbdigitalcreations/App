import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      id: 'notif-welcome',
      title: 'Welcome to LB Digital Creations',
      message: 'Explore our luxury templates or craft a bespoke celebration portal in Moments Studio.',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  ]);
}
