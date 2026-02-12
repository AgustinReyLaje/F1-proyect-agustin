'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SeasonContextType {
  currentSeason: number;
  setCurrentSeason: (year: number) => void;
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [currentSeason, setCurrentSeason] = useState<number>(2024);

  useEffect(() => {
    // Try to load from localStorage
    const stored = localStorage.getItem('selectedSeason');
    if (stored) {
      setCurrentSeason(parseInt(stored));
    } else {
      // Fetch active season from API
      fetch('http://localhost:8000/api/v1/seasons/')
        .then(res => res.json())
        .then(data => {
          const seasons = data.results || data;
          const active = seasons.find((s: any) => s.is_active);
          if (active) {
            setCurrentSeason(active.year);
          }
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
