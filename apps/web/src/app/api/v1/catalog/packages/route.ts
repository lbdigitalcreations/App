import { NextResponse } from 'next/server';
import { PACKAGES } from '../data';

export async function GET() {
  return NextResponse.json(PACKAGES);
}
