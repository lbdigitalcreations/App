import { NextRequest, NextResponse } from 'next/server';
import {
  formatSupabaseUser,
  supabaseAuthFetch,
  supabaseErrorResponse,
} from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const { ok, status, data } = await supabaseAuthFetch('/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!ok || !data.access_token) {
      return supabaseErrorResponse(data, 'Invalid email or password', status || 401);
    }

    return NextResponse.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: formatSupabaseUser(data.user),
    });
  } catch {
    return NextResponse.json({ message: 'Invalid login request' }, { status: 400 });
  }
}
