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
  const [driverTeams, setDriverTeams] = useState<Map<number, string>>(new Map());
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
      
      // Fetch team data for drivers
      if (standingType === 'driver') {
        await loadDriverTeams(sortedStandings);
      }
    } catch (err) {
      setError('Failed to load standings. Please try again later.');
      console.error('Error loading standings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDriverTeams = async (standings: ChampionshipStanding[]) => {
    try {
      // Get all results for the season to find team assignments
      let allResults: any[] = [];
      const resultsResponse = await f1Api.getResults({ race__season: currentSeason });
      allResults = resultsResponse.data.results || resultsResponse.data;
      
      // If paginated, fetch all pages
      let nextUrl = resultsResponse.data.next;
      while (nextUrl) {
        const nextResponse = await fetch(nextUrl);
        const nextData = await nextResponse.json();
        allResults = [...allResults, ...(nextData.results || [])];
        nextUrl = nextData.next;
      }
      
      const teamsMap = new Map<number, string>();
      standings.forEach((standing) => {
        if (standing.driver) {
          // Find all results for this driver
          const driverResults = allResults.filter((r: any) => r.driver?.id === standing.driver?.id);
          if (driverResults.length > 0) {
            // Sort by race date to get the most recent race
            const sortedResults = driverResults.sort((a: any, b: any) => {
              const dateA = new Date(a.race?.date || 0).getTime();
              const dateB = new Date(b.race?.date || 0).getTime();
              return dateB - dateA; // Most recent first
            });
            
            // Get the constructor from the most recent race
            const latestResult = sortedResults[0];
            if (latestResult.constructor) {
              teamsMap.set(standing.driver.id, latestResult.constructor.name);
            }
          }
        }
      });
      setDriverTeams(teamsMap);
    } catch (err) {
      console.error('Failed to load driver teams:', err);
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
    <div className="relative min-h-screen">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/images/tracks.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/75" />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-f1-red transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2 text-white">
            {standingType === 'driver' ? 'Drivers World Championship' : 'Constructors Championship'}
          </h1>
          <p className="text-gray-300">
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
                : 'bg-gray-800/60 backdrop-blur-sm text-gray-300 border border-gray-600 hover:border-f1-red'
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
                : 'bg-gray-800/60 backdrop-blur-sm text-gray-300 border border-gray-600 hover:border-f1-red'
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
          <div className="bg-red-900/30 backdrop-blur-sm border border-red-500/50 rounded-lg p-6 text-center">
            <p className="text-red-200">{error}</p>
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
              <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-900 to-gray-800 text-white border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                          {standingType === 'driver' ? 'Driver' : 'Team'}
                        </th>
                        {standingType === 'driver' && (
                          <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                            Constructor
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
                    <tbody className="divide-y divide-gray-800">
                      {standings.map((standing, index) => (
                        <tr
                          key={standing.id}
                          className={`
                            hover:bg-gray-800/50 transition-all duration-200
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
                            {standingType === 'driver' ? (
                              <div className={`font-bold text-lg ${
                                index < 3 ? 'text-white' : 'text-gray-200'
                              }`}>
                                {standing.driver?.full_name}
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                {standing.constructor?.car_image_url && (
                                  <img
                                    src={standing.constructor.car_image_url}
                                    alt={`${standing.constructor.name} logo`}
                                    className="w-12 h-12 object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                                <div className={`font-bold text-lg ${
                                  index < 3 ? 'text-white' : 'text-gray-200'
                                }`}>
                                  {standing.constructor?.name}
                                </div>
                              </div>
                            )}
                          </td>
                          {standingType === 'driver' && (
                            <td className="px-6 py-5 whitespace-nowrap">
                              {standing.driver && driverTeams.get(standing.driver.id) ? (
                                <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300 border border-gray-700">
                                  {driverTeams.get(standing.driver.id)}
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-gray-800/50 rounded-full text-sm text-gray-500">
                                  —
                                </span>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-5 whitespace-nowrap text-center">
                            <span className="text-2xl font-extrabold text-f1-red">
                              {standing.points}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-center">
                            <div className="inline-flex items-center gap-2">
                              <span className="text-xl font-bold text-white">
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
                <div className="px-6 py-4 bg-gray-950/50 border-t border-gray-700">
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span className="text-gray-300">1st Place</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-400 rounded"></div>
                      <span className="text-gray-300">2nd Place</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-600 rounded"></div>
                      <span className="text-gray-300">3rd Place</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-900/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700">
                <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-300">
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
    </div>
  );
}
