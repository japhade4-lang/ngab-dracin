'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Film, Flame, Sparkles, Search, Bookmark, Mic2 } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { label: 'Beranda', href: '/', icon: Film },
    { label: 'Trending', href: '/trending', icon: Flame },
    { label: 'Terbaru', href: '/terbaru', icon: Sparkles },
    { label: 'Dub Indo', href: '/dubindo', icon: Mic2 },
    { label: 'Koleksi', href: '/library', icon: Bookmark },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#090a0f]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white shadow-lg shadow-rose-600/30 transition-transform group-hover:scale-105">
              <Film className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-white whitespace-nowrap">
              NGAB<span className="text-rose-500">.DRACIN</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-white bg-white/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Search Action */}
        <Link
          href="/search"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs sm:text-sm whitespace-nowrap shrink-0 transition-all"
        >
          <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500 shrink-0" />
          <span className="hidden sm:inline">Cari Drama</span>
          <span className="sm:hidden">Cari</span>
        </Link>
      </div>
    </header>
  );
}
