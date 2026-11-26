import { NextRequest, NextResponse } from 'next/server';
import { TEMPLATES } from '../data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');

  let list = [...TEMPLATES];

  if (category) {
    list = list.filter((t) => t.serviceSlug === category);
  }
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        t.tagline.toLowerCase().includes(s) ||
        t.description.toLowerCase().includes(s),
    );
  }

  return NextResponse.json(list);
}
