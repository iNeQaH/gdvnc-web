import { NextResponse } from 'next/server';

export function publicApiError(error: unknown, fallback = 'Internal Server Error', status = 500) {
  console.error(error);
  return NextResponse.json({ error: fallback }, { status });
}
