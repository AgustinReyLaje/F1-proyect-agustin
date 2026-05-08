'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SeasonContextType {
  currentSeason: number;
  setCurrentSeason: (year: number) => void;
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

const DEFAULT_SEASON = 2026;

function detectCurrentSeasonYear(availableSeasons: Array<{ year: number; is_active?: boolean }>): number {
  if (!availableSeasons.length) return DEFAULT_SEASON;

  const active = availableSeasons.find((season) => season.is_active);
  if (active?.year) return active.year;

  const currentYear = new Date().getFullYear();
  const exact = availableSeasons.find((season) => season.year === currentYear);
  if (exact) return exact.year;

  const closestPast = availableSeasons
    .filter((season) => season.year <= currentYear)
    .sort((a, b) => b.year - a.year)[0];
  if (closestPast) return closestPast.year;

  return availableSeasons.sort((a, b) => b.year - a.year)[0].year || DEFAULT_SEASON;
}

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [currentSeason, setCurrentSeason] = useState<number>(DEFAULT_SEASON);

  useEffect(() => {
    // Try to load from localStorage
    const stored = localStorage.getItem('selectedSeason');
    if (stored) {
      setCurrentSeason(parseInt(stored));
    } else {
      // Fetch active season from API
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/seasons/`)
        .then(res => res.json())
        .then(data => {
          const seasons = (data.results || data || []) as Array<{ year: number; is_active?: boolean }>;
          setCurrentSeason(detectCurrentSeasonYear(seasons));
        })
        .catch(err => console.error('Error loading active season:', err));
    }
  }, []);

  const handleSetSeason = (year: number) => {
    setCurrentSeason(year);
    localStorage.setItem('selectedSeason', year.toString());
  };

  return (
    <SeasonContext.Provider value={{ currentSeason, setCurrentSeason: handleSetSeason }}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  const context = useContext(SeasonContext);
  if (context === undefined) {
    throw new Error('useSeason must be used within a SeasonProvider');
  }
  return context;
}
