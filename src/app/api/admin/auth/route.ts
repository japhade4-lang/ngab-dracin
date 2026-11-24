import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, isServerAdminAuthenticated } from '@/lib/accessAuth';
import { createSignedToken, verifyAdminPassword } from '@/lib/accessStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authenticated = await isServerAdminAuthenticated();
  return NextResponse.json({ authenticated });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = String(body?.password || '');

    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json(
        { success: false, error: 'Password admin salah.' },
        { status: 401 }
      );
    }

    const isHttps =
      req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:';
    const token = await createSignedToken({
      role: 'admin',
      exp: Date.now() + 7 * 24 * 3600 * 1000,
    });

    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      path: '/',
      maxAge: 7 * 24 * 3600,
    });
    return res;
  } catch {
    return NextResponse.json({ success: false, error: 'Permintaan gagal.' }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
