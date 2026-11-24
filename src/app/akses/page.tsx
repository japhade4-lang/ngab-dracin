import { getServerAccessStatus } from '@/lib/accessAuth';
import AksesClient from './AksesClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tarif Akses Harian (Mulai 5k) - Ngab Dracin',
  description: 'Aktifkan kode akses harian Ngab Dracin mulai Rp 5.000/hari untuk nonton semua episode tanpa batas.',
};

export default async function AksesPage() {
  const status = await getServerAccessStatus();
  return <AksesClient initialStatus={status} />;
}
