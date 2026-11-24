import { NextRequest, NextResponse } from 'next/server';
import { isServerAdminAuthenticated } from '@/lib/accessAuth';
import {
  changeAdminPassword,
  createVouchers,
  getAccessDb,
  updateAccessSettings,
  updateTariffPlans,
  updateVoucherStatus,
} from '@/lib/accessStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isServerAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getAccessDb();
  const now = Date.now();

  let activeCount = 0;
  let unusedCount = 0;
  let expiredCount = 0;
  let totalRevenue = 0;

  for (const v of db.vouchers) {
    if (!v.isRevoked) totalRevenue += v.price || 0;
    if (v.isRevoked) continue;
    if (!v.activatedAt) unusedCount++;
    else if (v.expiresAt && now < v.expiresAt) activeCount++;
    else expiredCount++;
  }

  return NextResponse.json({
    vouchers: db.vouchers,
    plans: db.plans,
    settings: db.settings,
    stats: {
      totalVouchers: db.vouchers.length,
      activeCount,
      unusedCount,
      expiredCount,
      totalRevenue,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!(await isServerAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const created = await createVouchers({
      days: Number(body?.days || 1),
      price: body?.price !== undefined ? Number(body.price) : undefined,
      planName: body?.planName ? String(body.planName) : undefined,
      label: body?.label ? String(body.label) : '',
      maxDevices: body?.maxDevices ? Number(body.maxDevices) : undefined,
      count: body?.count ? Number(body.count) : 1,
    });

    return NextResponse.json({ success: true, created });
  } catch {
    return NextResponse.json({ success: false, error: 'Gagal membuat kode.' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isServerAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (body?.action === 'updateSettings') {
      const settings = await updateAccessSettings(body.settings || {});
      return NextResponse.json({ success: true, settings });
    }

    if (body?.action === 'updatePlans') {
      const plans = await updateTariffPlans(body.plans || []);
      return NextResponse.json({ success: true, plans });
    }

    if (body?.action === 'changePassword') {
      const ok = await changeAdminPassword(String(body.newPassword || ''));
      if (!ok) {
        return NextResponse.json(
          { success: false, error: 'Password minimal 4 karakter.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (
      body?.code &&
      ['revoke', 'restore', 'resetDevices', 'delete'].includes(body?.action)
    ) {
      const ok = await updateVoucherStatus(String(body.code), body.action);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak dikenal.' }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: 'Permintaan gagal.' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isServerAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ success: false, error: 'Kode wajib diisi.' }, { status: 400 });
  }

  const ok = await updateVoucherStatus(code, 'delete');
  return NextResponse.json({ success: ok });
}
