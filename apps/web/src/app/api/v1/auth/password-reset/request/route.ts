import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthFetch, supabaseErrorResponse } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    const { ok, status, data } = await supabaseAuthFetch('/recover', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    if (!ok) {
      return supabaseErrorResponse(data, 'Failed to send reset instructions', status);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: 'Invalid password reset request' }, { status: 400 });
  }
}
