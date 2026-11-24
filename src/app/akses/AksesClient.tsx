'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicAccessStatus } from '@/types/access';
import PaywallGate, { formatRemainingTime } from '@/components/PaywallGate';
import { Crown, Smartphone, LogOut, Film, Clock } from 'lucide-react';

export default function AksesClient({ initialStatus }: { initialStatus: PublicAccessStatus }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleClearAccess = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/access/redeem', { method: 'DELETE' });
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-6 py-6 sm:py-10 space-y-6">
      {initialStatus.hasAccess ? (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-950/50 via-gray-900 to-black border border-emerald-500/30 p-5 sm:p-7 space-y-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Status Langganan Aktif
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  Paket {initialStatus.planName}
                </h1>
              </div>
            </div>

            <button
              onClick={handleClearAccess}
              disabled={loggingOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Ganti Kode</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-black/40 border border-white/10 p-3.5">
              <div className="text-[11px] text-gray-400 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                Sisa Masa Aktif
              </div>
              <div className="text-base font-bold text-white mt-1">
                {formatRemainingTime(initialStatus.remainingMs)}
              </div>
            </div>

            <div className="rounded-xl bg-black/40 border border-white/10 p-3.5">
              <div className="text-[11px] text-gray-400">Kode Aktif</div>
              <div className="text-sm font-mono font-bold text-emerald-300 mt-1">
                {initialStatus.codeMasked}
              </div>
            </div>

            <div className="rounded-xl bg-black/40 border border-white/10 p-3.5">
              <div className="text-[11px] text-gray-400 flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5 text-rose-400" />
                Perangkat Terpakai
              </div>
              <div className="text-base font-bold text-white mt-1">
                {initialStatus.devicesCount} / {initialStatus.maxDevices} HP
              </div>
            </div>
          </div>

          {initialStatus.expiresAt && (
            <p className="text-xs text-gray-400">
              Berakhir pada:{' '}
              <span className="text-gray-200 font-medium">
                {new Date(initialStatus.expiresAt).toLocaleString('id-ID', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </span>
            </p>
          )}

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-bold text-white shadow-lg shadow-rose-600/25"
          >
            <Film className="h-4 w-4" />
            <span>Mulai Nonton Semua Drama</span>
          </Link>
        </div>
      ) : (
        <PaywallGate accessStatus={initialStatus} />
      )}
    </div>
  );
}
