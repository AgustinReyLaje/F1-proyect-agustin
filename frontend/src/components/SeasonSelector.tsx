'use client';

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

export interface Season {
  id: number;
  year: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SeasonSelectorProps {
  currentSeason: number;
  onSeasonChange: (year: number) => void;
}

export default function SeasonSelector({ currentSeason, onSeasonChange }: SeasonSelectorProps) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/seasons/');
      const data = await response.json();
      setSeasons(data.results || data);
    } catch (error) {
      console.error('Error loading seasons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeasonChange = (year: number) => {
    onSeasonChange(year);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse">
        <Calendar className="w-4 h-4" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-label="Select season"
        aria-expanded={isOpen}
      >
        <Calendar className="w-4 h-4 text-f1-red" />
        <span className="font-semibold">{currentSeason} Season</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            <div className="py-1">
              {seasons.map((season) => (
                <button
                  key={season.id}
                  onClick={() => handleSeasonChange(season.year)}
                  className={`
                    w-full text-left px-4 py-2.5 text-sm transition-colors
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    ${season.year === currentSeason 
                      ? 'bg-f1-red/10 text-f1-red font-semibold' 
                      : 'text-gray-900 dark:text-gray-100'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span>{season.year} Season</span>
                    {season.is_active && (
                      <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
