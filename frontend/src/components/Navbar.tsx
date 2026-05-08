'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Trophy, Calendar, Zap, Menu, X } from 'lucide-react';
import { useState } from 'react';
import SeasonSelector from './SeasonSelector';
import F1Logo from './F1Logo';
import { useSeason } from '@/contexts/SeasonContext';

export default function Navbar() {
  const pathname = usePathname();
  const { currentSeason, setCurrentSeason } = useSeason();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: '/drivers', label: 'Drivers', icon: Users },
    { href: '/constructors', label: 'Teams', icon: Trophy },
    { href: '/standings', label: 'Standings', icon: Trophy },
    { href: '/races', label: 'Races', icon: Calendar },
    { href: '/predictions', label: 'Predictions', icon: Zap },
  ];

  return (
    <nav className="bg-gray-950/95 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50 shadow-lg shadow-black/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
            <F1Logo size="sm" />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-f1-red text-white shadow-lg shadow-red-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Season Selector */}
            <div className="ml-3 border-l border-gray-700 pl-3">
              <SeasonSelector
                currentSeason={currentSeason}
                onSeasonChange={setCurrentSeason}
              />
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-gray-800 mt-2 pt-3 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-f1-red text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
            <div className="px-4 pt-2">
              <SeasonSelector
                currentSeason={currentSeason}
                onSeasonChange={setCurrentSeason}
              />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
