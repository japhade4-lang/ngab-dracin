import { fetchDubbedDramas } from '@/lib/api';
import DramaCard from '@/components/DramaCard';
import { Volume2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Drama China Dubbing Indonesia - Nonton Sulih Suara Ngab Dracin',
  description: 'Kumpulan drama China lengkap dengan audio sulih suara (Dubbing) Bahasa Indonesia berkualitas HD tanpa ribet baca subtitle.',
};

export default async function DubIndoPage() {
  const dubbedDramas = await fetchDubbedDramas();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-rose-950/60 via-purple-950/40 to-black border border-rose-500/20 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-600/40">
            <Volume2 className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
            Kategori Spesial
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Sulih Suara Bahasa Indonesia (DubIndo)
        </h1>
        <p className="mt-2 text-sm text-gray-300 max-w-2xl leading-relaxed">
          Tonton ratusan drama China pilihan dengan audio Bahasa Indonesia. Dengarkan dialog penuh penghayatan tanpa perlu lelah membaca teks terjemahan!
        </p>
      </div>

      {/* Grid of Dubbed Dramas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-4">
        {dubbedDramas.map((drama) => (
          <DramaCard key={drama.id} drama={drama} />
        ))}
      </div>
    </div>
  );
}
