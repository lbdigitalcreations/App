import { NextRequest, NextResponse } from 'next/server';
import {
  formatSupabaseUser,
  supabaseAuthFetch,
  supabaseErrorResponse,
} from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) {
      return NextResponse.json({ message: 'Refresh token is required' }, { status: 400 });
    }

    const { ok, status, data } = await supabaseAuthFetch('/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!ok || !data.access_token) {
      return supabaseErrorResponse(data, 'Session expired', status || 401);
    }

    return NextResponse.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: formatSupabaseUser(data.user),
    });
  } catch {
    return NextResponse.json({ message: 'Invalid refresh request' }, { status: 400 });
  }
}
