import { cookies } from 'next/headers';
import {
  checkSessionAccess,
  getAccessDb,
  maskVoucherCode,
  verifySignedToken,
} from './accessStore';
import { PublicAccessStatus } from '@/types/access';

export const ACCESS_COOKIE = 'dracin_access';
export const DEVICE_COOKIE = 'dracin_device';
export const ADMIN_COOKIE = 'dracin_admin';

export async function getServerAccessStatus(): Promise<PublicAccessStatus> {
  const db = await getAccessDb();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const deviceId = cookieStore.get(DEVICE_COOKIE)?.value;

  const check = await checkSessionAccess(sessionToken, deviceId);

  if (check.valid && check.voucher) {
    return {
      hasAccess: true,
      codeMasked: maskVoucherCode(check.voucher.code),
      planName: check.voucher.planName,
      expiresAt: check.voucher.expiresAt,
      remainingMs: check.remainingMs,
      devicesCount: check.voucher.devices.length,
      maxDevices: check.voucher.maxDevices,
      freeEpisodes: db.settings.freeEpisodes,
      plans: db.plans,
      settings: db.settings,
    };
  }

  return {
    hasAccess: false,
    freeEpisodes: db.settings.freeEpisodes,
    plans: db.plans,
    settings: db.settings,
  };
}

export async function isServerEpisodeAllowed(episodeNumber: number): Promise<{
  allowed: boolean;
  status: PublicAccessStatus;
}> {
  const status = await getServerAccessStatus();
  const allowed = episodeNumber <= status.freeEpisodes || status.hasAccess;
  return { allowed, status };
}

export async function isServerAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  const payload = await verifySignedToken<{ role?: string; exp?: number }>(token);
  if (!payload || payload.role !== 'admin') return false;
  if (payload.exp && Date.now() > payload.exp) return false;
  return true;
}
