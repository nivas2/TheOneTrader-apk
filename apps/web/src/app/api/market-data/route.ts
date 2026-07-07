import { NextResponse } from 'next/server';

// Server-side: fetch from Express API directly (same machine)
const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://localhost:5050';

export async function GET() {
  try {
    const res = await fetch(`${INTERNAL_API}/api/v1/ticker`, {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ data: [] }, { status: 502 });
    }

    const payload = await res.json();
    return NextResponse.json({ data: payload.indices || [] });
  } catch {
    return NextResponse.json({ data: [] }, { status: 502 });
  }
}
