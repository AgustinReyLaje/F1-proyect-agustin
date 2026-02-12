'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flag, Users, Trophy, Calendar } from 'lucide-react';
import SeasonSelector from './SeasonSelector';
import { useSeason } from '@/contexts/SeasonContext';

export default function Navbar() {
  const pathname = usePathname();
  const { currentSeason, setCurrentSeason } = useSeason();

  const navLinks = [
    { href: '/drivers', label: 'Drivers', icon: Users },
    { href: '/constructors', label: 'Teams', icon: Trophy },
    { href: '/standings', label: 'Standings', icon: Trophy },
    { href: '/races', label: 'Races', icon: Calendar },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="p-2 bg-f1-red rounded-lg">
              <Flag className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white hidden sm:inline">
              F1 Analytics
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-f1-red text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Season Selector */}
            <SeasonSelector
              currentSeason={currentSeason}
              onSeasonChange={setCurrentSeason}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
