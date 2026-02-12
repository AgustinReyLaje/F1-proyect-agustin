'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { f1Api } from '@/lib/api';
import { Race } from '@/types/f1';
import { ArrowLeft, Calendar, MapPin, Loader2 } from 'lucide-react';
import { useSeason } from '@/contexts/SeasonContext';

export default function RacesPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentSeason } = useSeason();

  useEffect(() => {
    loadRaces();
  }, [currentSeason]);

  const loadRaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await f1Api.getRaces({ season: currentSeason });
      
      // Handle paginated response
      const data = response.data.results || response.data;
      const races = Array.isArray(data) ? data : [];
      
      // Sort by round
      const sortedRaces = races.sort(
        (a: Race, b: Race) => a.round - b.round
      );
      setRaces(sortedRaces);
    } catch (err) {
      setError('Failed to load races. Please try again later.');
      console.error('Error loading races:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-f1-red transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <h1 className="text-4xl font-bold mb-2">F1 Race Calendar</h1>
        <p className="text-gray-600 dark:text-gray-300">
          All Formula 1 races for the {currentSeason} season
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-f1-red" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={loadRaces}
            className="mt-4 px-6 py-2 bg-f1-red text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Races List */}
      {!loading && !error && (
        <>
          {races.length > 0 ? (
            <div className="space-y-4">
              {races.map((race) => (
                <RaceCard key={race.id} race={race} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-xl text-gray-500">
                No races found for the {season} season
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function RaceCard({ race }: { race: Race }) {
  const raceDate = new Date(race.date);
  const isPastRace = raceDate < new Date();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all p-6 border-l-4 border-f1-red">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Round Badge */}
        <div className="flex-shrink-0">
          <div className="bg-f1-red text-white px-4 py-2 rounded-lg text-center">
            <div className="text-xs font-semibold uppercase">Round</div>
            <div className="text-2xl font-bold">{race.round}</div>
          </div>
        </div>

        {/* Race Info */}
        <div className="flex-1">
          <h3 className="text-2xl font-bold mb-2">{race.race_name}</h3>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{race.circuit_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {raceDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
          <div className="mt-2 text-sm">
            <span className="text-gray-500">Location:</span>{' '}
            <span className="font-semibold">
              {race.locality}, {race.country}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          <span
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              isPastRace
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            }`}
          >
            {isPastRace ? 'Completed' : 'Upcoming'}
          </span>
        </div>
      </div>

      {race.url && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <a
            href={race.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-f1-red hover:text-red-700 font-medium text-sm"
          >
            View Race Details →
          </a>
        </div>
      )}
    </div>
  );
}
