'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { f1Api } from '@/lib/api';
import { Race, Result, Qualifying, Sprint, ProgressiveStandingsResponse } from '@/types/f1';
import { ArrowLeft, Calendar, MapPin, Loader2, Trophy, Timer, Flag, AlertCircle } from 'lucide-react';

export default function RaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const raceId = params.id as string;

  const [race, setRace] = useState<Race | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [qualifying, setQualifying] = useState<Qualifying[]>([]);
  const [sprint, setSprint] = useState<Sprint[]>([]);
  const [progressiveStandings, setProgressiveStandings] = useState<ProgressiveStandingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'qualifying' | 'sprint' | 'race' | 'standings'>('race');
  const [showAllStandings, setShowAllStandings] = useState(false);

  useEffect(() => {
    loadRaceData();
  }, [raceId]);

  const loadRaceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load race details
      const raceResponse = await f1Api.getRace(parseInt(raceId));
      const raceData = raceResponse.data;
      setRace(raceData);

      // Load results
      const resultsResponse = await f1Api.getResults({ race: parseInt(raceId) });
      const allResults = resultsResponse.data.results || resultsResponse.data;
      setResults(allResults);

      // Load qualifying
      try {
        const qualifyingResponse = await f1Api.getQualifying({ race: parseInt(raceId) });
        const qualifyingData = qualifyingResponse.data.results || qualifyingResponse.data;
        setQualifying(qualifyingData);
      } catch (err) {
        console.log('No qualifying data available');
        setQualifying([]);
      }

      // Load sprint (may not exist)
      try {
        const sprintResponse = await f1Api.getSprint({ race: parseInt(raceId) });
        const sprintData = sprintResponse.data.results || sprintResponse.data;
        setSprint(sprintData);
      } catch (err) {
        console.log('No sprint data available');
        setSprint([]);
      }

      // Load progressive standings
      if (raceData) {
        const standingsResponse = await f1Api.getProgressiveStandings({
          season: raceData.season,
          round: raceData.round,
          type: 'driver'
        });
        setProgressiveStandings(standingsResponse.data);
      }

      // Set default active tab based on available data
      if (allResults.length > 0) {
        setActiveTab('race');
      } else if (qualifyingData.length > 0) {
        setActiveTab('qualifying');
      }

    } catch (err) {
      setError('Failed to load race details. Please try again later.');
      console.error('Error loading race data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-12 h-12 animate-spin text-f1-red" />
      </div>
    );
  }

  if (error || !race) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-white text-xl mb-4">{error || 'Race not found'}</p>
          <Link
            href="/races"
            className="px-6 py-3 bg-f1-red text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Races
          </Link>
        </div>
      </div>
    );
  }

  const raceDate = new Date(race.date);
  const hasSprint = sprint.length > 0;
  const hasQualifying = qualifying.length > 0;

  return (
    <div className="relative min-h-screen">
      {/* Background */}
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/85" />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/races"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-f1-red transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Races
          </Link>
          
          <div className="flex items-start gap-6">
            <div className="bg-f1-red text-white px-6 py-4 rounded-xl text-center flex-shrink-0">
              <div className="text-xs font-semibold uppercase">Round</div>
              <div className="text-4xl font-bold">{race.round}</div>
            </div>

            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-3 text-white">{race.race_name}</h1>
              <div className="flex flex-wrap gap-4 text-gray-300">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>{race.circuit_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
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
              <p className="text-gray-400 mt-2">
                {race.locality}, {race.country}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mt-8 mb-8 py-4 flex gap-2 overflow-x-auto pb-2">
          {hasQualifying && (
            <button
              onClick={() => setActiveTab('qualifying')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === 'qualifying'
                  ? 'bg-f1-red text-white'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'
              }`}
            >
              <Timer className="w-4 h-4 inline mr-2" />
              Starting Grid
            </button>
          )}
          {hasSprint && (
            <button
              onClick={() => setActiveTab('sprint')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === 'sprint'
                  ? 'bg-f1-red text-white'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'
              }`}
            >
              <Flag className="w-4 h-4 inline mr-2" />
              Sprint Race
            </button>
          )}
          <button
            onClick={() => setActiveTab('race')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
              activeTab === 'race'
                ? 'bg-f1-red text-white'
                : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'
            }`}
          >
            <Flag className="w-4 h-4 inline mr-2" />
            Race Results
          </button>
          {progressiveStandings && (
            <button
              onClick={() => setActiveTab('standings')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === 'standings'
                  ? 'bg-f1-red text-white'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'
              }`}
            >
              <Trophy className="w-4 h-4 inline mr-2" />
              Championship After Race
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'qualifying' && hasQualifying && (
            <QualifyingSection qualifying={qualifying} />
          )}

          {activeTab === 'sprint' && hasSprint && (
            <SprintSection sprint={sprint} />
          )}

          {activeTab === 'race' && (
            <RaceResultsSection results={results} />
          )}

          {activeTab === 'standings' && progressiveStandings && (
            <StandingsSection 
              standings={progressiveStandings} 
              showAll={showAllStandings}
              onToggleShowAll={() => setShowAllStandings(!showAllStandings)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// Qualifying Section Component
function QualifyingSection({ qualifying }: { qualifying: Qualifying[] }) {
  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Timer className="w-6 h-6 text-f1-red" />
        Starting Grid (Qualifying Results)
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Pos</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Driver</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Team</th>
              <th className="text-right py-3 px-4 text-gray-400 font-semibold">Q1</th>
              <th className="text-right py-3 px-4 text-gray-400 font-semibold">Q2</th>
              <th className="text-right py-3 px-4 text-gray-400 font-semibold">Q3</th>
            </tr>
          </thead>
          <tbody>
            {qualifying.map((q) => (
              <tr
                key={q.id}
                className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: q.constructor.team_color || '#ef4444',
                }}
              >
                <td className="py-4 px-4">
                  <span className="font-bold text-white text-lg">
                    {q.position}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div>
                    <div className="font-semibold text-white">
                      {q.driver.first_name} {q.driver.last_name}
                    </div>
                    <div className="text-sm text-gray-400">{q.driver.code}</div>
                  </div>
                </td>
                <td className="py-4 px-4 text-gray-300">
                  {q.constructor.name}
                </td>
                <td className="py-4 px-4 text-right text-gray-300 font-mono">
                  {q.q1_time || '-'}
                </td>
                <td className="py-4 px-4 text-right text-gray-300 font-mono">
                  {q.q2_time || '-'}
                </td>
                <td className="py-4 px-4 text-right text-gray-300 font-mono">
                  {q.q3_time || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Sprint Section Component
function SprintSection({ sprint }: { sprint: Sprint[] }) {
  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Flag className="w-6 h-6 text-f1-red" />
        Sprint Race Results
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Pos</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Driver</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Team</th>
              <th className="text-right py-3 px-4 text-gray-400 font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            {sprint.map((s) => {
              let pointsDisplay;
              if (s.status === 'retired' || s.status.startsWith('retired')) {
                pointsDisplay = <span className="text-red-400 font-bold">DNF</span>;
              } else if (s.status === 'dns' || s.status === 'did not start') {
                pointsDisplay = <span className="text-red-400 font-bold">DNS</span>;
              } else if (s.points > 0) {
                pointsDisplay = <span className="text-white font-bold">{s.points}</span>;
              } else {
                pointsDisplay = <span className="text-gray-400">0</span>;
              }

              return (
                <tr
                  key={s.id}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: s.constructor.team_color || '#ef4444',
                  }}
                >
                  <td className="py-4 px-4">
                    <span className="font-bold text-white text-lg">
                      {s.position_text}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-semibold text-white">
                        {s.driver.first_name} {s.driver.last_name}
                      </div>
                      <div className="text-sm text-gray-400">{s.driver.code}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-300">
                    {s.constructor.name}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-lg">
                      {pointsDisplay}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Race Results Section with Podium Emphasis
function RaceResultsSection({ results }: { results: Result[] }) {
  const podium = results.filter(r => r.final_position && r.final_position <= 3);
  const others = results.filter(r => !r.final_position || r.final_position > 3);

  return (
    <div className="space-y-6">
      {/* Podium Section */}
      {podium.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {podium.map((result) => (
            <PodiumCard key={result.id} result={result} />
          ))}
        </div>
      )}

      {/* Other Results */}
      <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Flag className="w-6 h-6 text-f1-red" />
          Full Race Results
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Pos</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Driver</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Team</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Points</th>
              </tr>
            </thead>
            <tbody>
              {others.map((result) => (
                <ResultRow key={result.id} result={result} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Podium Card Component
function PodiumCard({ result }: { result: Result }) {
  const position = result.final_position || 0;
  const colors = {
    1: { bg: 'from-yellow-600/20 to-yellow-900/20', border: 'border-yellow-400', text: 'text-yellow-400', medal: '🥇' },
    2: { bg: 'from-gray-400/20 to-gray-700/20', border: 'border-gray-300', text: 'text-gray-300', medal: '🥈' },
    3: { bg: 'from-orange-600/20 to-orange-900/20', border: 'border-orange-600', text: 'text-orange-600', medal: '🥉' },
  };

  const style = colors[position as 1 | 2 | 3] || colors[1];

  return (
    <div 
      className={`bg-gradient-to-br ${style.bg} backdrop-blur-sm rounded-xl p-6 border-2 ${style.border} transform hover:scale-105 transition-transform`}
      style={{
        borderLeftWidth: '6px',
        borderLeftColor: result.constructor.team_color || '#ef4444',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className={`text-6xl font-bold ${style.text}`}>
          P{position}
        </span>
        <span className="text-5xl">{style.medal}</span>
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-white">
          {result.driver.first_name} {result.driver.last_name}
        </h3>
        <p className="text-gray-300 font-semibold">{result.constructor.name}</p>
        
        {result.points > 0 && (
          <div className="pt-4 border-t border-gray-700">
            <span className="text-3xl font-bold text-white">{result.points}</span>
            <span className="text-gray-400 ml-2">points</span>
          </div>
        )}

        {result.fastest_lap_time && (
          <div className="text-sm text-gray-400">
            <Timer className="w-3 h-3 inline mr-1" />
            Fastest lap: {result.fastest_lap_time}
          </div>
        )}
      </div>
    </div>
  );
}

// Result Row Component
function ResultRow({ result }: { result: Result }) {
  let pointsDisplay;
  if (result.status === 'retired' || result.status.startsWith('retired')) {
    pointsDisplay = <span className="text-red-400 font-bold">DNF</span>;
  } else if (result.status === 'dns' || result.status === 'did not start') {
    pointsDisplay = <span className="text-red-400 font-bold">DNS</span>;
  } else if (result.points > 0) {
    pointsDisplay = <span className="text-white font-bold">{result.points}</span>;
  } else {
    pointsDisplay = <span className="text-gray-400">0</span>;
  }

  return (
    <tr
      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: result.constructor.team_color || '#ef4444',
      }}
    >
      <td className="py-4 px-4">
        <span className="font-bold text-white text-lg">
          {result.position_text}
        </span>
      </td>
      <td className="py-4 px-4">
        <div>
          <div className="font-semibold text-white">
            {result.driver.first_name} {result.driver.last_name}
          </div>
          <div className="text-sm text-gray-400">{result.driver.code}</div>
        </div>
      </td>
      <td className="py-4 px-4 text-gray-300">
        {result.constructor.name}
      </td>
      <td className="py-4 px-4 text-right">
        <span className="text-lg">
          {pointsDisplay}
        </span>
      </td>
    </tr>
  );
}

// Status Badge Component
function StatusBadge({ status, reason }: { status: string; reason: string | null }) {
  if (status === 'finished') {
    return (
      <span className="px-3 py-1 bg-green-900/40 text-green-400 rounded-full text-xs font-semibold border border-green-500/30">
        Finished
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col items-center">
      <span className="px-3 py-1 bg-red-900/40 text-red-400 rounded-full text-xs font-semibold border border-red-500/30 mb-1">
        {status.toUpperCase()}
      </span>
      {reason && (
        <span className="text-xs text-gray-400 italic">
          {reason}
        </span>
      )}
    </div>
  );
}

// Standings Section Component
function StandingsSection({ 
  standings, 
  showAll, 
  onToggleShowAll 
}: { 
  standings: ProgressiveStandingsResponse; 
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const displayedStandings = showAll ? standings.standings : standings.standings.slice(0, 5);

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          Drivers Championship After Round {standings.round}
        </h2>
        {standings.standings.length > 5 && (
          <button
            onClick={onToggleShowAll}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-semibold"
          >
            {showAll ? 'Show Top 5' : 'Show All'}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {displayedStandings.map((standing, idx) => (
          <div
            key={standing.driver.id}
            className="flex items-center gap-4 p-4 bg-gray-800/60 rounded-lg hover:bg-gray-800/80 transition-colors"
            style={{
              borderLeftWidth: '4px',
              borderLeftColor: standing.constructor?.team_color || '#ef4444',
            }}
          >
            <div className="w-12 text-center">
              <span className={`text-2xl font-bold ${
                standing.position === 1 ? 'text-yellow-400' :
                standing.position === 2 ? 'text-gray-300' :
                standing.position === 3 ? 'text-orange-600' :
                'text-white'
              }`}>
                {standing.position}
              </span>
            </div>

            <div className="flex-1">
              <div className="font-bold text-white text-lg">
                {standing.driver.first_name} {standing.driver.last_name}
              </div>
              <div className="text-sm text-gray-400">
                {standing.constructor?.name || 'Unknown Team'}
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {standing.points}
              </div>
              <div className="text-xs text-gray-400">
                {standing.wins} {standing.wins === 1 ? 'win' : 'wins'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
