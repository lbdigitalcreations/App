import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthFetch } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (token) {
    await supabaseAuthFetch('/logout', { method: 'POST', token }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
