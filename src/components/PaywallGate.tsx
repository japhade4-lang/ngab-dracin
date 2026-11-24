'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicAccessStatus, TariffPlan } from '@/types/access';
import {
  KeyRound,
  Lock,
  CheckCircle2,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';

interface PaywallGateProps {
  accessStatus: PublicAccessStatus;
  lockedEpisode?: number;
  dramaTitle?: string;
  onUnlocked?: () => void;
}

export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export function formatRemainingTime(ms?: number | null): string {
  if (!ms || ms <= 0) return 'Kedaluwarsa';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}h ${hours}j lagi`;
  if (hours > 0) return `${hours}j ${mins}m lagi`;
  return `${Math.max(1, mins)} menit lagi`;
}

export default function PaywallGate({
  accessStatus,
  lockedEpisode,
  dramaTitle,
  onUnlocked,
}: PaywallGateProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<TariffPlan>(
    accessStatus.plans[0] || {
      id: '1d',
      name: '1 Hari',
      days: 1,
      durationHours: 24,
      price: 5000,
    }
  );
  const [showQris, setShowQris] = useState(false);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || loading) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/access/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Kode akses tidak valid.');
        return;
      }

      setSuccessMsg(`Akses ${data.planName} aktif! Membuka episode...`);
      setCode('');
      if (onUnlocked) {
        onUnlocked();
      }
      router.refresh();
    } catch {
      setErrorMsg('Gagal menghubungi server. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const buildWhatsAppHref = (plan: TariffPlan) => {
    const wa = accessStatus.settings.whatsappNumber?.trim();
    const dramaCtx = dramaTitle ? ` untuk nonton "${dramaTitle}"` : '';
    const msg = encodeURIComponent(
      `Halo Admin Ngab Dracin, saya mau beli Kode Akses paket *${plan.name} (${formatRupiah(plan.price)})*${dramaCtx}. Mohon info pembayarannya.`
    );
    return wa ? `https://wa.me/${wa}?text=${msg}` : `https://wa.me/?text=${msg}`;
  };

  return (
    <div className="rounded-2xl bg-gradient-to-b from-gray-900/95 to-[#0d0f17] border border-white/10 p-4 sm:p-6 space-y-5 shadow-2xl">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-600/20 border border-rose-500/30 text-rose-400">
          <Lock className="h-5 w-5" />
        </div>
        <h2 className="text-base sm:text-xl font-extrabold text-white">
          {lockedEpisode
            ? `Episode ${lockedEpisode} Khusus Akses Harian`
            : 'Aktifkan Akses Nonton Full Episode'}
        </h2>
        <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
          Episode 1–{accessStatus.freeEpisodes} gratis. Buka semua drama & episode tanpa batas mulai{' '}
          <span className="text-rose-400 font-bold">Rp 5.000 / hari</span>.
        </p>
      </div>

      {/* Redeem Code Form */}
      <form onSubmit={handleRedeem} className="max-w-md mx-auto space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Sudah punya Kode Akses?
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="DRACIN-XXXX-XXXX"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs sm:text-sm font-mono uppercase text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs sm:text-sm font-bold text-white whitespace-nowrap transition-all flex items-center gap-1.5 shadow-lg shadow-rose-600/25"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{loading ? 'Cek...' : 'Aktifkan'}</span>
          </button>
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}
        {successMsg && (
          <p className="text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </p>
        )}
      </form>

      {/* Divider */}
      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-rose-400" />
            Pilih Paket Tarif Harian (5k / hari)
          </h3>
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Smartphone className="h-3.5 w-3.5 text-rose-400" />
            Maks {accessStatus.settings.defaultMaxDevices} perangkat
          </span>
        </div>

        {/* Tariff Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {accessStatus.plans.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id;
            return (
              <button
                type="button"
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`relative text-left rounded-xl p-3 border transition-all ${
                  isSelected
                    ? 'bg-rose-600/15 border-rose-500 shadow-lg shadow-rose-600/10'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/25'
                }`}
              >
                {plan.badge && (
                  <span className="inline-block mb-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-rose-600 text-white">
                    {plan.badge}
                  </span>
                )}
                <div className="text-sm sm:text-base font-extrabold text-white">{plan.name}</div>
                <div className="text-sm sm:text-base font-black text-rose-400 mt-0.5">
                  {formatRupiah(plan.price)}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {plan.durationHours} jam akses penuh
                </div>
              </button>
            );
          })}
        </div>

        {/* Order Actions */}
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 text-xs text-gray-300">
            <div className="font-bold text-white">
              Paket dipilih: {selectedPlan.name} ({formatRupiah(selectedPlan.price)})
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {accessStatus.settings.paymentNote}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {accessStatus.settings.qrisImageUrl && (
              <button
                type="button"
                onClick={() => setShowQris(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors whitespace-nowrap"
              >
                <QrCode className="h-4 w-4 text-rose-400" />
                <span>Lihat QRIS</span>
              </button>
            )}

            <a
              href={buildWhatsAppHref(selectedPlan)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition-colors whitespace-nowrap"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Beli via WhatsApp</span>
            </a>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Masa aktif baru mulai dihitung saat kode pertama kali Anda aktifkan.</span>
        </div>
      </div>

      {/* QRIS Modal */}
      {showQris && accessStatus.settings.qrisImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-gray-900 border border-white/15 p-5 space-y-3 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => setShowQris(false)}
              className="absolute right-3 top-3 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-sm font-bold text-white">
              Scan QRIS ({selectedPlan.name} - {formatRupiah(selectedPlan.price)})
            </h3>
            <div className="rounded-xl bg-white p-2 inline-block mx-auto">
              <img
                src={accessStatus.settings.qrisImageUrl}
                alt="QRIS Pembayaran"
                className="w-60 h-60 object-contain mx-auto"
              />
            </div>
            <p className="text-xs text-gray-400">
              Setelah bayar, kirim bukti ke WhatsApp Admin untuk menerima Kode Akses.
            </p>
            <a
              href={buildWhatsAppHref(selectedPlan)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Konfirmasi via WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
