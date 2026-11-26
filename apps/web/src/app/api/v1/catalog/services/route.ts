import { NextResponse } from 'next/server';
import { SERVICES } from '../data';

export async function GET() {
  return NextResponse.json(SERVICES);
}
