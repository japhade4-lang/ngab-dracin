import { fetchDubbedDramas } from '@/lib/api';
import DramaCard from '@/components/DramaCard';
import { Volume2 } from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dubbing Indonesia - Ngab Dracin',
  description: 'Kumpulan drama China lengkap dengan sulih suara (Dubbing) Bahasa Indonesia.',
};

export default async function DubIndoPage() {
  const dubbedDramas = await fetchDubbedDramas();

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Dubbing Indonesia
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {dubbedDramas.length} drama dengan sulih suara Bahasa Indonesia
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {dubbedDramas.map((drama) => (
          <DramaCard key={`${drama.source}_${drama.id}`} drama={drama} />
        ))}
      </div>
    </div>
  );
}
