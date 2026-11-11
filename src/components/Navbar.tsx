'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Film, Flame, Sparkles, Search, Bookmark, Mic2 } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { label: 'Beranda', href: '/', icon: Film },
    { label: 'Shorts', href: '/shorts', icon: Flame, badge: 'HOT' },
    { label: 'Dub Indo', href: '/dubindo', icon: Mic2, badge: 'DUB' },
    { label: 'Trending', href: '/trending', icon: Sparkles },
    { label: 'Koleksi', href: '/library', icon: Bookmark },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#090a0f]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white shadow-lg shadow-rose-600/30 transition-transform group-hover:scale-105">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">
                NGAB<span className="text-rose-500">.DRACIN</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Web
              </span>
            </div>
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                    isActive
                      ? 'text-white bg-white/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-600 text-white">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Search Action */}
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs sm:text-sm transition-all"
          >
            <Search className="h-4 w-4 text-rose-400" />
            <span className="hidden sm:inline">Cari drama...</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
