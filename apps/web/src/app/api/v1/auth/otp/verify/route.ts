import { NextRequest, NextResponse } from 'next/server';
import {
  formatSupabaseUser,
  normalizePhone,
  supabaseAuthFetch,
  supabaseErrorResponse,
} from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json();
    if (!phone || !otp) {
      return NextResponse.json({ message: 'Phone and OTP are required' }, { status: 400 });
    }

    const { ok, status, data } = await supabaseAuthFetch('/verify', {
      method: 'POST',
      body: JSON.stringify({
        phone: normalizePhone(String(phone)),
        token: String(otp).trim(),
        type: 'sms',
      }),
    });

    if (!ok || !data.access_token) {
      return supabaseErrorResponse(data, 'Invalid or expired OTP', status || 400);
    }

    return NextResponse.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: formatSupabaseUser(data.user),
    });
  } catch {
    return NextResponse.json({ message: 'Invalid OTP verification request' }, { status: 400 });
  }
}
