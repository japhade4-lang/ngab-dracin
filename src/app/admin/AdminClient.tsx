'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AccessSettings, TariffPlan, Voucher } from '@/types/access';
import { formatRupiah, formatRemainingTime } from '@/components/PaywallGate';
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  Ban,
  RotateCcw,
  Smartphone,
  Settings,
  LogOut,
  MessageCircle,
  Loader2,
  ShieldCheck,
  Ticket,
  Upload,
} from 'lucide-react';

interface AdminStats {
  totalVouchers: number;
  activeCount: number;
  unusedCount: number;
  expiredCount: number;
  totalRevenue: number;
}

export default function AdminClient({ initialAuthenticated }: { initialAuthenticated: boolean }) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [tab, setTab] = useState<'vouchers' | 'settings'>('vouchers');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [plans, setPlans] = useState<TariffPlan[]>([]);
  const [settings, setSettings] = useState<AccessSettings>({
    freeEpisodes: 3,
    defaultMaxDevices: 2,
    whatsappNumber: '',
    qrisImageUrl: '',
    paymentNote: '',
  });
  const [stats, setStats] = useState<AdminStats>({
    totalVouchers: 0,
    activeCount: 0,
    unusedCount: 0,
    expiredCount: 0,
    totalRevenue: 0,
  });
  const [loadingData, setLoadingData] = useState(false);

  // Quick voucher generator state
  const [genDays, setGenDays] = useState<number>(1);
  const [genPrice, setGenPrice] = useState<number>(5000);
  const [genLabel, setGenLabel] = useState('');
  const [genMaxDevices, setGenMaxDevices] = useState<number>(2);
  const [genCount, setGenCount] = useState<number>(1);
  const [generating, setGenerating] = useState(false);
  const [lastCreated, setLastCreated] = useState<Voucher[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unused' | 'expired' | 'revoked'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Settings form
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/admin/vouchers');
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setVouchers(data.vouchers || []);
        setPlans(data.plans || []);
        if (data.settings) {
          setSettings(data.settings);
          setGenMaxDevices(data.settings.defaultMaxDevices || 2);
        }
        if (data.stats) setStats(data.stats);
      }
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadDashboard();
    }
  }, [authenticated, loadDashboard]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError(data.error || 'Password salah.');
        return;
      }
      setAuthenticated(true);
      setPasswordInput('');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setAuthenticated(false);
  };

  const selectPreset = (days: number, price: number) => {
    setGenDays(days);
    setGenPrice(price);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days: genDays,
          price: genPrice,
          planName: `${genDays} Hari`,
          label: genLabel,
          maxDevices: genMaxDevices,
          count: genCount,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLastCreated(data.created || []);
        setGenLabel('');
        await loadDashboard();
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleVoucherAction = async (
    code: string,
    action: 'revoke' | 'restore' | 'resetDevices' | 'delete'
  ) => {
    await fetch('/api/admin/vouchers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, action }),
    });
    await loadDashboard();
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const buildCustomerMessage = (v: Voucher) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://139.190.101.34';
    return `Terima kasih! Ini Kode Akses Ngab Dracin Anda:\n\nKode: ${v.code}\nPaket: ${v.planName} (${formatRupiah(v.price)})\nBatas: Maks ${v.maxDevices} perangkat\n\nCara pakai: Buka ${origin}/akses lalu masukkan kode di atas. Masa aktif baru mulai berjalan saat pertama kali dipakai.`;
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSavedMsg(null);
    try {
      await fetch('/api/admin/vouchers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateSettings', settings }),
      });
      await fetch('/api/admin/vouchers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updatePlans', plans }),
      });
      if (newAdminPassword.trim().length >= 4) {
        await fetch('/api/admin/vouchers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'changePassword',
            newPassword: newAdminPassword.trim(),
          }),
        });
        setNewAdminPassword('');
      }
      setSettingsSavedMsg('Pengaturan berhasil disimpan!');
      setTimeout(() => setSettingsSavedMsg(null), 3000);
      await loadDashboard();
    } finally {
      setSavingSettings(false);
    }
  };

  const handleQrisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSettings((prev) => ({ ...prev, qrisImageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const getVoucherState = (v: Voucher): 'revoked' | 'unused' | 'active' | 'expired' => {
    if (v.isRevoked) return 'revoked';
    if (!v.activatedAt) return 'unused';
    if (v.expiresAt && Date.now() < v.expiresAt) return 'active';
    return 'expired';
  };

  const filteredVouchers = vouchers.filter((v) => {
    const state = getVoucherState(v);
    if (statusFilter !== 'all' && state !== statusFilter) return false;
    if (
      searchTerm &&
      !v.code.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !v.label.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="text-center space-y-1.5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600/20 border border-rose-500/30 text-rose-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-extrabold text-white">Login Admin Ngab Dracin</h1>
            <p className="text-xs text-gray-400">
              Kelola tarif harian, buat kode akses pelanggan, dan pantau perangkat aktif.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Masukkan Password Admin..."
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
              autoFocus
            />
            {loginError && <p className="text-xs text-rose-400">{loginError}</p>}
            <button
              type="submit"
              disabled={loggingIn || !passwordInput}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-sm font-bold text-white shadow-lg"
            >
              {loggingIn ? 'Memverifikasi...' : 'Masuk Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <Ticket className="h-6 w-6 text-rose-500" />
            Dashboard Akses & Tarif Pelanggan
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Tarif kelipatan Rp 5.000 / hari • Maksimal {settings.defaultMaxDevices} perangkat
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/akses"
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200"
          >
            Halaman Pelanggan
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 text-xs font-semibold text-gray-300 hover:text-rose-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5">
          <div className="text-[11px] text-gray-400">Estimasi Pendapatan</div>
          <div className="text-lg sm:text-xl font-black text-emerald-400 mt-1">
            {formatRupiah(stats.totalRevenue)}
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5">
          <div className="text-[11px] text-gray-400">Sedang Aktif</div>
          <div className="text-lg sm:text-xl font-black text-white mt-1">{stats.activeCount} Kode</div>
        </div>
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5">
          <div className="text-[11px] text-gray-400">Stok Belum Dipakai</div>
          <div className="text-lg sm:text-xl font-black text-amber-400 mt-1">{stats.unusedCount} Kode</div>
        </div>
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5">
          <div className="text-[11px] text-gray-400">Total Dibuat</div>
          <div className="text-lg sm:text-xl font-black text-gray-300 mt-1">{stats.totalVouchers} Kode</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setTab('vouchers')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
            tab === 'vouchers' ? 'bg-rose-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Buat & Kelola Kode</span>
        </button>
        <button
          onClick={() => setTab('settings')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
            tab === 'settings' ? 'bg-rose-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Pengaturan Tarif, WA & QRIS</span>
        </button>
      </div>

      {tab === 'vouchers' ? (
        <div className="space-y-6">
          {/* Quick Generator Box */}
          <form
            onSubmit={handleGenerate}
            className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-6 space-y-4"
          >
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-rose-500" />
              Buat Kode Akses Pelanggan
            </h2>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
              {(plans.length > 0
                ? plans
                : [
                    { id: '1d', name: '1 Hari', days: 1, durationHours: 24, price: 5000 },
                    { id: '3d', name: '3 Hari', days: 3, durationHours: 72, price: 15000 },
                    { id: '7d', name: '7 Hari', days: 7, durationHours: 168, price: 35000 },
                    { id: '30d', name: '30 Hari', days: 30, durationHours: 720, price: 150000 },
                  ]
              ).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => selectPreset(p.days, p.price)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                    genDays === p.days && genPrice === p.price
                      ? 'bg-rose-600 border-rose-500 text-white shadow'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {p.name} • {formatRupiah(p.price)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Durasi (Hari)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={genDays}
                  onChange={(e) => {
                    const d = Math.max(1, parseInt(e.target.value || '1', 10));
                    setGenDays(d);
                    setGenPrice(d * 5000);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Harga (Rp)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={genPrice}
                  onChange={(e) => setGenPrice(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Batas Perangkat</label>
                <select
                  value={genMaxDevices}
                  onChange={(e) => setGenMaxDevices(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-sm text-white"
                >
                  <option value={1}>1 Perangkat</option>
                  <option value={2}>2 Perangkat</option>
                  <option value={3}>3 Perangkat</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Jumlah Kode</label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={genCount}
                  onChange={(e) => setGenCount(Math.max(1, Math.min(25, parseInt(e.target.value || '1', 10))))}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={genLabel}
                onChange={(e) => setGenLabel(e.target.value)}
                placeholder="Catatan nama / No WA pelanggan (opsional, misal: Budi 0812...)"
                className="flex-1 px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs sm:text-sm text-white placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={generating}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 whitespace-nowrap"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span>Buat Kode Akses</span>
              </button>
            </div>

            {/* Newly Created Highlight */}
            {lastCreated.length > 0 && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 space-y-2">
                <div className="text-xs font-bold text-emerald-400">
                  Berhasil membuat {lastCreated.length} kode akses baru:
                </div>
                <div className="space-y-2">
                  {lastCreated.map((v) => (
                    <div
                      key={v.code}
                      className="flex flex-wrap items-center justify-between gap-2 bg-black/40 rounded-lg px-3 py-2"
                    >
                      <div>
                        <span className="font-mono font-bold text-sm text-white">{v.code}</span>
                        <span className="ml-2 text-xs text-gray-400">
                          ({v.planName} • {formatRupiah(v.price)})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyText(v.code, `new-code-${v.code}`)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white"
                        >
                          {copiedId === `new-code-${v.code}` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span>Salin Kode</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyText(buildCustomerMessage(v), `new-wa-${v.code}`)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                        >
                          {copiedId === `new-wa-${v.code}` ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <MessageCircle className="h-3.5 w-3.5" />
                          )}
                          <span>Salin Pesan WA</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>

          {/* Voucher List */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari kode atau nama pelanggan..."
                className="sm:w-72 px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs sm:text-sm text-white placeholder-gray-500"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'active', label: 'Aktif' },
                  { id: 'unused', label: 'Belum Dipakai' },
                  { id: 'expired', label: 'Habis' },
                  { id: 'revoked', label: 'Diblokir' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id as typeof statusFilter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                      statusFilter === f.id ? 'bg-rose-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingData ? (
              <div className="py-10 text-center text-gray-400 text-sm">Memuat daftar kode...</div>
            ) : filteredVouchers.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-sm">
                Belum ada kode akses di kategori ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredVouchers.map((v) => {
                  const st = getVoucherState(v);
                  const remaining = v.expiresAt ? v.expiresAt - Date.now() : null;
                  return (
                    <div
                      key={v.code}
                      className="rounded-xl bg-black/35 border border-white/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-white">{v.code}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              st === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : st === 'unused'
                                ? 'bg-amber-500/20 text-amber-300'
                                : st === 'revoked'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
                            {st === 'active'
                              ? 'Aktif'
                              : st === 'unused'
                              ? 'Belum Dipakai'
                              : st === 'revoked'
                              ? 'Diblokir'
                              : 'Habis'}
                          </span>
                          <span className="text-xs text-gray-300 font-semibold">
                            {v.planName} ({formatRupiah(v.price)})
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                          {v.label && <span className="text-gray-200 font-medium">Pelanggan: {v.label}</span>}
                          <span className="flex items-center gap-1">
                            <Smartphone className="h-3 w-3 text-rose-400" />
                            {v.devices.length}/{v.maxDevices} perangkat
                          </span>
                          {st === 'active' && remaining && (
                            <span className="text-emerald-400">{formatRemainingTime(remaining)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => copyText(buildCustomerMessage(v), `wa-${v.code}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 text-xs font-semibold flex items-center gap-1"
                        >
                          {copiedId === `wa-${v.code}` ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <MessageCircle className="h-3.5 w-3.5" />
                          )}
                          <span>Salin WA</span>
                        </button>

                        {v.devices.length > 0 && (
                          <button
                            onClick={() => handleVoucherAction(v.code, 'resetDevices')}
                            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 text-xs flex items-center gap-1"
                            title="Reset daftar perangkat (misal pelanggan ganti HP)"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Reset HP</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleVoucherAction(v.code, v.isRevoked ? 'restore' : 'revoke')}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 text-xs flex items-center gap-1"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>{v.isRevoked ? 'Buka Blokir' : 'Blokir'}</span>
                        </button>

                        <button
                          onClick={() => handleVoucherAction(v.code, 'delete')}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/25 text-gray-400 hover:text-rose-400"
                          title="Hapus kode"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Settings Tab */
        <form
          onSubmit={handleSaveSettings}
          className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Nomor WhatsApp Admin (diawali 62)
              </label>
              <input
                type="text"
                value={settings.whatsappNumber}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                placeholder="6281234567890"
                className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Tombol &quot;Beli via WhatsApp&quot; pelanggan akan mengarah ke nomor ini.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Episode Gratis
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={settings.freeEpisodes}
                  onChange={(e) =>
                    setSettings({ ...settings, freeEpisodes: parseInt(e.target.value || '0', 10) })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Default Maks HP
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.defaultMaxDevices}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultMaxDevices: Math.max(1, parseInt(e.target.value || '2', 10)),
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300">
              Gambar QRIS Pembayaran (Opsional — URL atau Upload Gambar)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={settings.qrisImageUrl}
                onChange={(e) => setSettings({ ...settings, qrisImageUrl: e.target.value })}
                placeholder="https://... atau klik Upload QRIS"
                className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs sm:text-sm text-white"
              />
              <label className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer whitespace-nowrap">
                <Upload className="h-4 w-4 text-rose-400" />
                <span>Upload QRIS</span>
                <input type="file" accept="image/*" onChange={handleQrisUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Catatan Pembayaran Pelanggan
            </label>
            <textarea
              rows={2}
              value={settings.paymentNote}
              onChange={(e) => setSettings({ ...settings, paymentNote: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs sm:text-sm text-white"
            />
          </div>

          {/* Plans Editor */}
          <div className="border-t border-white/10 pt-4 space-y-2">
            <label className="block text-xs font-bold text-white uppercase">
              Daftar Paket Tarif (Otomatis Tampil ke Pelanggan)
            </label>
            <div className="space-y-2">
              {plans.map((p, idx) => (
                <div key={p.id} className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => {
                      const copy = [...plans];
                      copy[idx] = { ...p, name: e.target.value };
                      setPlans(copy);
                    }}
                    placeholder="Nama paket"
                    className="px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-xs text-white"
                  />
                  <input
                    type="number"
                    min={1}
                    value={p.days}
                    onChange={(e) => {
                      const days = Math.max(1, parseInt(e.target.value || '1', 10));
                      const copy = [...plans];
                      copy[idx] = { ...p, days, durationHours: days * 24 };
                      setPlans(copy);
                    }}
                    placeholder="Hari"
                    className="px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-xs text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={p.price}
                    onChange={(e) => {
                      const copy = [...plans];
                      copy[idx] = { ...p, price: Math.max(0, parseInt(e.target.value || '0', 10)) };
                      setPlans(copy);
                    }}
                    placeholder="Harga Rp"
                    className="px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-xs text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Ganti Password Admin (Kosongkan jika tidak ingin mengubah)
            </label>
            <input
              type="password"
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              placeholder="Password baru minimal 4 karakter..."
              className="sm:w-72 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs sm:text-sm text-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-bold text-white shadow-lg"
            >
              {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
            {settingsSavedMsg && <span className="text-xs font-semibold text-emerald-400">{settingsSavedMsg}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
