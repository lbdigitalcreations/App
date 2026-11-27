import { NextRequest, NextResponse } from 'next/server';
import {
  formatSupabaseUser,
  supabaseAuthFetch,
  supabaseErrorResponse,
} from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, phone, password, referralCode } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const { ok, status, data } = await supabaseAuthFetch('/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        data: {
          full_name: fullName || email.split('@')[0],
          phone: phone || undefined,
          referral_code: referralCode || undefined,
        },
      }),
    });

    if (!ok) {
      return supabaseErrorResponse(data, 'Registration failed', status);
    }

    if (!data.access_token) {
      return NextResponse.json(
        {
          message:
            'Account created! Please check your email to confirm your account before signing in.',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: formatSupabaseUser(data.user),
    });
  } catch {
    return NextResponse.json({ message: 'Invalid registration request' }, { status: 400 });
  }
}
