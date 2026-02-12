'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { f1Api } from '@/lib/api';
import { ChampionshipStanding } from '@/types/f1';
import { ArrowLeft, Trophy, Users, Loader2 } from 'lucide-react';
import { useSeason } from '@/contexts/SeasonContext';

type StandingType = 'driver' | 'constructor';

export default function StandingsPage() {
  const [standings, setStandings] = useState<ChampionshipStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [standingType, setStandingType] = useState<StandingType>('driver');
  const { currentSeason } = useSeason();

  useEffect(() => {
    loadStandings();
  }, [standingType, currentSeason]);

  const loadStandings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await f1Api.getStandings({
        season: currentSeason,
        standing_type: standingType,
        round: 0, // 0 means season total
      });
      
      // Handle paginated response
      const data = response.data.results || response.data;
      const standings = Array.isArray(data) ? data : [];
      
      // Sort by position
      const sortedStandings = standings.sort(
        (a: ChampionshipStanding, b: ChampionshipStanding) => a.position - b.position
      );
      setStandings(sortedStandings);
    } catch (err) {
      setError('Failed to load standings. Please try again later.');
      console.error('Error loading standings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get glow effect for top 3 positions
  const getPositionClass = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-900/20 dark:to-transparent border-l-4 border-yellow-500';
    if (index === 1) return 'bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-700/20 dark:to-transparent border-l-4 border-gray-400';
    if (index === 2) return 'bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-900/20 dark:to-transparent border-l-4 border-orange-600';
    return '';
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-f1-red transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <h1 className="text-4xl font-bold mb-2">Championship Standings</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Current championship standings for the {currentSeason} season
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setStandingType('driver')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            standingType === 'driver'
              ? 'bg-f1-red text-white shadow-lg scale-105'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:border-f1-red'
          }`}
        >
          <Users className="w-5 h-5" />
          Drivers Championship
        </button>
        <button
          onClick={() => setStandingType('constructor')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            standingType === 'constructor'
              ? 'bg-f1-red text-white shadow-lg scale-105'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:border-f1-red'
          }`}
        >
          <Trophy className="w-5 h-5" />
          Constructors Championship
        </button>
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
            onClick={loadStandings}
            className="mt-4 px-6 py-2 bg-f1-red text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Standings Table */}
      {!loading && !error && (
        <>
          {standings.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                        {standingType === 'driver' ? 'Driver' : 'Team'}
                      </th>
                      {standingType === 'driver' && (
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                          Nationality
                        </th>
                      )}
                      <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider">
                        Wins
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {standings.map((standing, index) => (
                      <tr
                        key={standing.id}
                        className={`
                          hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all duration-200
                          ${getPositionClass(index)}
                        `}
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-3xl font-black ${
                                index === 0
                                  ? 'text-yellow-500'
                                  : index === 1
                                  ? 'text-gray-400'
                                  : index === 2
                                  ? 'text-orange-600'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {standing.position}
                            </span>
                            {index < 3 && (
                              <Trophy
                                className={`w-6 h-6 ${
                                  index === 0
                                    ? 'text-yellow-500 drop-shadow-lg'
                                    : index === 1
                                    ? 'text-gray-400 drop-shadow-lg'
                                    : 'text-orange-600 drop-shadow-lg'
                                }`}
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className={`font-bold text-lg ${
                            index < 3 ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'
                          }`}>
                            {standingType === 'driver'
                              ? standing.driver?.full_name
                              : standing.constructor?.name}
                          </div>
                        </td>
                        {standingType === 'driver' && (
                          <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                              {standing.driver?.nationality}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-5 whitespace-nowrap text-center">
                          <span className="text-2xl font-extrabold text-f1-red">
                            {standing.points}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-center">
                          <div className="inline-flex items-center gap-2">
                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                              {standing.wins}
                            </span>
                            {standing.wins > 0 && (
                              <Trophy className="w-5 h-5 text-f1-red" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Legend */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span className="text-gray-700 dark:text-gray-300">1st Place</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-400 rounded"></div>
                    <span className="text-gray-700 dark:text-gray-300">2nd Place</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-600 rounded"></div>
                    <span className="text-gray-700 dark:text-gray-300">3rd Place</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
              <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl text-gray-500">
                No standings data available for {currentSeason} season
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Try selecting a different season or championship type
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
