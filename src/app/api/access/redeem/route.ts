import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_COOKIE, DEVICE_COOKIE } from '@/lib/accessAuth';
import { maskVoucherCode, redeemVoucherCode } from '@/lib/accessStore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body?.code || '').trim();

    const cookieStore = await cookies();
    let deviceId = cookieStore.get(DEVICE_COOKIE)?.value;
    if (!deviceId || deviceId.length < 8) {
      deviceId = crypto.randomUUID();
    }

    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const result = await redeemVoucherCode(code, deviceId, userAgent);

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const isHttps =
      req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:';
    const maxAgeSec = Math.max(
      60,
      Math.floor(((result.voucher.expiresAt || Date.now()) - Date.now()) / 1000)
    );

    const res = NextResponse.json({
      success: true,
      planName: result.voucher.planName,
      codeMasked: maskVoucherCode(result.voucher.code),
      expiresAt: result.voucher.expiresAt,
      devicesCount: result.voucher.devices.length,
      maxDevices: result.voucher.maxDevices,
    });

    res.cookies.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    res.cookies.set(ACCESS_COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      path: '/',
      maxAge: maxAgeSec,
    });

    return res;
  } catch {
    return NextResponse.json({ success: false, error: 'Permintaan tidak valid.' }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(ACCESS_COOKIE);
  return res;
}
