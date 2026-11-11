'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Film, Flame, Mic2, Search, Bookmark } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();

  const links = [
    { label: 'Beranda', href: '/', icon: Film },
    { label: 'Shorts', href: '/shorts', icon: Flame },
    { label: 'Dub Indo', href: '/dubindo', icon: Mic2 },
    { label: 'Cari', href: '/search', icon: Search },
    { label: 'Koleksi', href: '/library', icon: Bookmark },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 bg-[#090a0f]/95 backdrop-blur-lg px-2 py-1">
      <div className="flex items-center justify-around">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                isActive ? 'text-rose-500' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className={`h-5 w-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px]">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
