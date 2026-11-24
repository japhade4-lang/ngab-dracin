import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AccessDatabase,
  AccessSettings,
  TariffPlan,
  Voucher,
} from '@/types/access';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'access-db.json');

const DEFAULT_PLANS: TariffPlan[] = [
  { id: '1d', name: '1 Hari', days: 1, durationHours: 24, price: 5000, badge: 'Harian' },
  { id: '3d', name: '3 Hari', days: 3, durationHours: 72, price: 15000 },
  { id: '7d', name: '7 Hari', days: 7, durationHours: 168, price: 35000, badge: 'Populer' },
  { id: '30d', name: '30 Hari', days: 30, durationHours: 720, price: 150000, badge: 'Bulanan' },
];

const DEFAULT_SETTINGS: AccessSettings = {
  freeEpisodes: 3,
  defaultMaxDevices: 2,
  whatsappNumber: '',
  qrisImageUrl: '',
  paymentNote:
    'Transfer sesuai nominal paket, lalu kirim bukti pembayaran ke WhatsApp Admin untuk mendapatkan Kode Akses.',
};

declare global {
  var __dracinAccessDb: AccessDatabase | undefined;
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`ngab-dracin-salt:${password}`).digest('hex');
}

function createInitialDb(): AccessDatabase {
  const initialAdminPass = process.env.ADMIN_PASSWORD || 'admin12345';
  const authSecret = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
  return {
    authSecret,
    adminPasswordHash: hashPassword(initialAdminPass),
    plans: DEFAULT_PLANS,
    settings: DEFAULT_SETTINGS,
    vouchers: [],
  };
}

function saveDb(db: AccessDatabase): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const tmp = `${DB_PATH}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmp, DB_PATH);
  } catch (err) {
    console.error('[AccessDB] Failed to persist database:', err);
  }
}

export function getAccessDb(): AccessDatabase {
  if (globalThis.__dracinAccessDb) {
    return globalThis.__dracinAccessDb;
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<AccessDatabase>;
      const initial = createInitialDb();
      const db: AccessDatabase = {
        authSecret: parsed.authSecret || initial.authSecret,
        adminPasswordHash: parsed.adminPasswordHash || initial.adminPasswordHash,
        plans: Array.isArray(parsed.plans) && parsed.plans.length > 0 ? parsed.plans : DEFAULT_PLANS,
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        vouchers: Array.isArray(parsed.vouchers) ? parsed.vouchers : [],
      };
      globalThis.__dracinAccessDb = db;
      return db;
    } catch (err) {
      console.warn('[AccessDB] Corrupt DB file, recreating:', err);
    }
  }

  const db = createInitialDb();
  saveDb(db);
  globalThis.__dracinAccessDb = db;
  return db;
}

// =========================================================================
// Token Signing / Verification (HMAC-SHA256)
// =========================================================================

function signPayload(payloadB64: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

export function createSignedToken(payload: object): string {
  const db = getAccessDb();
  const b64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = signPayload(b64, db.authSecret);
  return `${b64}.${sig}`;
}

export function verifySignedToken<T = Record<string, unknown>>(token: string | undefined): T | null {
  if (!token || !token.includes('.')) return null;
  const db = getAccessDb();
  const [b64, sig] = token.split('.', 2);
  if (!b64 || !sig) return null;
  const expected = signPayload(b64, db.authSecret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
    return JSON.parse(Buffer.from(b64, 'base64url').toString('utf-8')) as T;
  } catch {
    return null;
  }
}

// =========================================================================
// Voucher Redemption & Verification
// =========================================================================

export interface SessionPayload {
  code: string;
  deviceId: string;
  expiresAt: number;
}

export function checkSessionAccess(
  sessionToken: string | undefined,
  deviceId: string | undefined
): { valid: boolean; voucher?: Voucher; remainingMs?: number } {
  if (!sessionToken || !deviceId) return { valid: false };
  const payload = verifySignedToken<SessionPayload>(sessionToken);
  if (!payload || !payload.code || !payload.deviceId) return { valid: false };
  if (payload.deviceId !== deviceId) return { valid: false };

  const db = getAccessDb();
  const voucher = db.vouchers.find((v) => v.code === payload.code);
  if (!voucher) return { valid: false };
  if (voucher.isRevoked) return { valid: false };

  const now = Date.now();
  if (!voucher.expiresAt || now >= voucher.expiresAt) {
    return { valid: false };
  }

  const device = voucher.devices.find((d) => d.deviceId === deviceId);
  if (!device) {
    // Device was reset/removed by admin
    return { valid: false };
  }

  // Throttle lastSeenAt updates to once per 5 minutes so disk isn't hammered
  if (now - device.lastSeenAt > 5 * 60 * 1000) {
    device.lastSeenAt = now;
    saveDb(db);
  }

  return {
    valid: true,
    voucher,
    remainingMs: Math.max(0, voucher.expiresAt - now),
  };
}

export function redeemVoucherCode(
  rawCode: string,
  deviceId: string,
  userAgent: string
):
  | { ok: true; voucher: Voucher; token: string }
  | { ok: false; error: string } {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { ok: false, error: 'Masukkan kode akses terlebih dahulu.' };
  }

  const db = getAccessDb();
  const voucher = db.vouchers.find((v) => v.code.toUpperCase() === code);
  if (!voucher) {
    return { ok: false, error: 'Kode akses tidak ditemukan. Periksa kembali penulisan kode.' };
  }
  if (voucher.isRevoked) {
    return { ok: false, error: 'Kode akses ini telah dinonaktifkan oleh admin.' };
  }

  const now = Date.now();
  if (voucher.expiresAt && now >= voucher.expiresAt) {
    return { ok: false, error: 'Masa aktif kode ini sudah habis. Silakan perpanjang akses.' };
  }

  const existingDevice = voucher.devices.find((d) => d.deviceId === deviceId);
  if (!existingDevice) {
    if (voucher.devices.length >= voucher.maxDevices) {
      return {
        ok: false,
        error: `Kode ini sudah digunakan di maksimal ${voucher.maxDevices} perangkat. Hubungi admin jika ganti HP.`,
      };
    }
    voucher.devices.push({
      deviceId,
      userAgent: userAgent.slice(0, 120),
      firstUsedAt: now,
      lastSeenAt: now,
    });
  } else {
    existingDevice.lastSeenAt = now;
    existingDevice.userAgent = userAgent.slice(0, 120);
  }

  // First activation starts the countdown clock
  const resolvedExpiresAt =
    voucher.expiresAt || now + voucher.durationHours * 3600 * 1000;
  if (!voucher.activatedAt) {
    voucher.activatedAt = now;
    voucher.expiresAt = resolvedExpiresAt;
  }

  saveDb(db);

  const token = createSignedToken({
    code: voucher.code,
    deviceId,
    expiresAt: resolvedExpiresAt,
  } satisfies SessionPayload);

  return { ok: true, voucher, token };
}

export function maskVoucherCode(code: string): string {
  if (code.length <= 6) return code;
  return `${code.slice(0, 7)}****${code.slice(-3)}`;
}

// =========================================================================
// Admin Management Helpers
// =========================================================================

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateReadableCode(): string {
  const part = (len: number) => {
    let out = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      out += CODE_CHARS[bytes[i] % CODE_CHARS.length];
    }
    return out;
  };
  return `DRACIN-${part(4)}-${part(4)}`;
}

export function createVouchers(params: {
  days: number;
  price?: number;
  planName?: string;
  label?: string;
  maxDevices?: number;
  count?: number;
}): Voucher[] {
  const db = getAccessDb();
  const days = Math.max(1, Math.min(365, Math.floor(params.days || 1)));
  const count = Math.max(1, Math.min(25, Math.floor(params.count || 1)));
  const durationHours = days * 24;
  const price = typeof params.price === 'number' && params.price >= 0 ? params.price : days * 5000;
  const planName = params.planName?.trim() || `${days} Hari`;
  const maxDevices = Math.max(1, Math.min(10, params.maxDevices || db.settings.defaultMaxDevices || 2));
  const now = Date.now();

  const existingCodes = new Set(db.vouchers.map((v) => v.code));
  const created: Voucher[] = [];

  for (let i = 0; i < count; i++) {
    let code = generateReadableCode();
    while (existingCodes.has(code)) {
      code = generateReadableCode();
    }
    existingCodes.add(code);

    const voucher: Voucher = {
      code,
      label: (params.label || '').trim(),
      planName,
      price,
      durationHours,
      maxDevices,
      createdAt: now,
      activatedAt: null,
      expiresAt: null,
      isRevoked: false,
      devices: [],
    };
    db.vouchers.unshift(voucher);
    created.push(voucher);
  }

  saveDb(db);
  return created;
}

export function updateVoucherStatus(
  code: string,
  action: 'revoke' | 'restore' | 'resetDevices' | 'delete'
): boolean {
  const db = getAccessDb();
  const idx = db.vouchers.findIndex((v) => v.code === code);
  if (idx === -1) return false;

  if (action === 'delete') {
    db.vouchers.splice(idx, 1);
  } else if (action === 'revoke') {
    db.vouchers[idx].isRevoked = true;
  } else if (action === 'restore') {
    db.vouchers[idx].isRevoked = false;
  } else if (action === 'resetDevices') {
    db.vouchers[idx].devices = [];
  }

  saveDb(db);
  return true;
}

export function updateAccessSettings(partial: Partial<AccessSettings>): AccessSettings {
  const db = getAccessDb();
  db.settings = {
    freeEpisodes:
      typeof partial.freeEpisodes === 'number'
        ? Math.max(0, Math.min(50, Math.floor(partial.freeEpisodes)))
        : db.settings.freeEpisodes,
    defaultMaxDevices:
      typeof partial.defaultMaxDevices === 'number'
        ? Math.max(1, Math.min(10, Math.floor(partial.defaultMaxDevices)))
        : db.settings.defaultMaxDevices,
    whatsappNumber:
      typeof partial.whatsappNumber === 'string'
        ? partial.whatsappNumber.replace(/[^\d]/g, '')
        : db.settings.whatsappNumber,
    qrisImageUrl:
      typeof partial.qrisImageUrl === 'string'
        ? partial.qrisImageUrl.trim()
        : db.settings.qrisImageUrl,
    paymentNote:
      typeof partial.paymentNote === 'string'
        ? partial.paymentNote.trim()
        : db.settings.paymentNote,
  };
  saveDb(db);
  return db.settings;
}

export function updateTariffPlans(plans: TariffPlan[]): TariffPlan[] {
  const db = getAccessDb();
  const sanitized = plans
    .filter((p) => p && p.name && p.days > 0 && p.price >= 0)
    .map((p, idx) => ({
      id: p.id || `plan-${idx}-${p.days}d`,
      name: String(p.name).trim(),
      days: Math.max(1, Math.floor(Number(p.days))),
      durationHours: Math.max(1, Math.floor(Number(p.days)) * 24),
      price: Math.max(0, Math.floor(Number(p.price))),
      badge: p.badge ? String(p.badge).trim() : undefined,
    }));

  if (sanitized.length > 0) {
    db.plans = sanitized;
    saveDb(db);
  }
  return db.plans;
}

export function verifyAdminPassword(password: string): boolean {
  const db = getAccessDb();
  if (!password) return false;
  if (!db.adminPasswordCustomized && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
    return true;
  }
  return hashPassword(password) === db.adminPasswordHash;
}

export function changeAdminPassword(newPassword: string): boolean {
  if (!newPassword || newPassword.trim().length < 4) return false;
  const db = getAccessDb();
  db.adminPasswordHash = hashPassword(newPassword.trim());
  db.adminPasswordCustomized = true;
  saveDb(db);
  return true;
}
