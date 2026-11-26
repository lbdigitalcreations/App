import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // If token is a Supabase JWT, query Supabase
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pnqzohzckfryffgypzux.supabase.co';
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBucXpvaHpja2ZyeWZmZ3lwenV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2NjQ4OTYsImV4cCI6MjExMTI0MDg5Nn0.0KydHH0gLSNyI85vZ_RPvzvHH3-7zKKneQVxrZOJlGI';

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        id: data.id,
        email: data.email,
        profile: {
          fullName:
            data.user_metadata?.full_name ||
            data.user_metadata?.name ||
            data.email?.split('@')[0] ||
            'Customer',
          avatarUrl: data.user_metadata?.avatar_url || data.user_metadata?.picture || null,
          city: '',
          state: '',
          country: 'India',
        },
      });
    }
  } catch {}

  return NextResponse.json({
    id: 'user_active',
    email: 'customer@lbdigitalcreations.in',
    profile: {
      fullName: 'Valued Customer',
      avatarUrl: null,
      city: '',
      state: '',
      country: 'India',
    },
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      id: 'user_active',
      profile: {
        fullName: body.fullName || 'Valued Customer',
        city: body.city || '',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
  }
}
