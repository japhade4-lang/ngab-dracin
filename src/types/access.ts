export interface TariffPlan {
  id: string;
  name: string;
  days: number;
  durationHours: number;
  price: number;
  badge?: string;
}

export interface VoucherDevice {
  deviceId: string;
  userAgent: string;
  firstUsedAt: number;
  lastSeenAt: number;
}

export interface Voucher {
  code: string;
  label: string;
  planName: string;
  price: number;
  durationHours: number;
  maxDevices: number;
  createdAt: number;
  activatedAt: number | null;
  expiresAt: number | null;
  isRevoked: boolean;
  devices: VoucherDevice[];
}

export interface AccessSettings {
  freeEpisodes: number;
  defaultMaxDevices: number;
  whatsappNumber: string;
  qrisImageUrl: string;
  paymentNote: string;
}

export interface AccessDatabase {
  authSecret: string;
  adminPasswordHash: string;
  adminPasswordCustomized?: boolean;
  plans: TariffPlan[];
  settings: AccessSettings;
  vouchers: Voucher[];
}

export interface PublicAccessStatus {
  hasAccess: boolean;
  codeMasked?: string;
  planName?: string;
  expiresAt?: number | null;
  remainingMs?: number;
  devicesCount?: number;
  maxDevices?: number;
  freeEpisodes: number;
  plans: TariffPlan[];
  settings: AccessSettings;
}
