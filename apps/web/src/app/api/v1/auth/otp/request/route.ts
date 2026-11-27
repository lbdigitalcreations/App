import { NextRequest, NextResponse } from 'next/server';
import { normalizePhone, supabaseAuthFetch, supabaseErrorResponse } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ message: 'Phone number is required' }, { status: 400 });
    }

    const normalized = normalizePhone(String(phone));
    const { ok, status, data } = await supabaseAuthFetch('/otp', {
      method: 'POST',
      body: JSON.stringify({ phone: normalized }),
    });

    if (!ok) {
      const errMsg = String(data?.msg || data?.error_description || data?.message || '');
      if (
        data?.error_code === 'phone_provider_disabled' ||
        errMsg.toLowerCase().includes('phone') && errMsg.toLowerCase().includes('disabled')
      ) {
        return NextResponse.json(
          {
            message:
              'Phone OTP SMS is not enabled on the server yet. Please sign in with Google, Facebook, or Email & Password.',
          },
          { status: 400 },
        );
      }
      return supabaseErrorResponse(data, 'Failed to send OTP', status);
    }

    return NextResponse.json({ ok: true, phone: normalized });
  } catch {
    return NextResponse.json({ message: 'Invalid OTP request' }, { status: 400 });
  }
}
