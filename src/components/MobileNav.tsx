'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Film, Flame, Mic2, Sparkles, Bookmark } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();

  const links = [
    { label: 'Beranda', href: '/', icon: Film },
    { label: 'Trending', href: '/trending', icon: Flame },
    { label: 'Terbaru', href: '/terbaru', icon: Sparkles },
    { label: 'Dub Indo', href: '/dubindo', icon: Mic2 },
    { label: 'Koleksi', href: '/library', icon: Bookmark },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 bg-[#090a0f]/95 backdrop-blur-lg px-1 py-1">
      <div className="flex items-center justify-around">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                isActive ? 'text-rose-500' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className={`h-5 w-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] leading-none">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
