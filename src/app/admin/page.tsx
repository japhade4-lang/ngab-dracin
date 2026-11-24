import { isServerAdminAuthenticated } from '@/lib/accessAuth';
import AdminClient from './AdminClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Tarif & Kode Akses - Ngab Dracin',
  description: 'Panel admin untuk membuat kode akses pelanggan, tarif harian 5k, dan pengaturan WhatsApp/QRIS.',
};

export default async function AdminPage() {
  const authenticated = await isServerAdminAuthenticated();
  return <AdminClient initialAuthenticated={authenticated} />;
}
