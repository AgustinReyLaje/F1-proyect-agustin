'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { f1Api } from '@/lib/api';
import { Race, Result, Qualifying, Sprint, FreePractice, ProgressiveStandingsResponse } from '@/types/f1';
import { ArrowLeft, Calendar, MapPin, Loader2, Trophy, Timer, Flag, AlertCircle, Activity } from 'lucide-react';

export default function RaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const raceId = params.id as string;

  const [race, setRace] = useState<Race | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [qualifying, setQualifying] = useState<Qualifying[]>([]);
  const [sprint, setSprint] = useState<Sprint[]>([]);
  const [freePractice, setFreePractice] = useState<FreePractice[]>([]);
  const [progressiveStandings, setProgressiveStandings] = useState<ProgressiveStandingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fp1' | 'fp2' | 'fp3' | 'qualifying' | 'sprint' | 'race' | 'standings'>('race');
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
      let qualifyingData: Qualifying[] = [];
      try {
        const qualifyingResponse = await f1Api.getQualifying({ race: parseInt(raceId) });
        qualifyingData = qualifyingResponse.data.results || qualifyingResponse.data;
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

      // Load free practice sessions
      try {
        const fpResponse = await f1Api.getFreePractice({ race: parseInt(raceId) });
        const fpData = fpResponse.data.results || fpResponse.data;
        setFreePractice(fpData);
      } catch (err) {
        console.log('No free practice data available');
        setFreePractice([]);
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
  const hasFP1 = freePractice.some(fp => fp.session === 'FP1');
  const hasFP2 = freePractice.some(fp => fp.session === 'FP2');
  const hasFP3 = freePractice.some(fp => fp.session === 'FP3');
  const fp1Data = freePractice.filter(fp => fp.session === 'FP1').sort((a, b) => a.position - b.position);
  const fp2Data = freePractice.filter(fp => fp.session === 'FP2').sort((a, b) => a.position - b.position);
  const fp3Data = freePractice.filter(fp => fp.session === 'FP3').sort((a, b) => a.position - b.position);

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
          {hasFP1 && (
            <button
              onClick={() => setActiveTab('fp1')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === 'fp1'
                  ? 'bg-f1-red text-white'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              FP1
            </button>
          )}
          {hasFP2 && (
            <button
              onClick={() => setActiveTab('fp2')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === 'fp2'
                  ? 'bg-f1-red text-white'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              FP2
            </button>
          )}
          {hasFP3 && (
            <button
              onClick={() => setActiveTab('fp3')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === 'fp3'
                  ? 'bg-f1-red text-white'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              FP3
            </button>
          )}
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
              Qualifying
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
          {activeTab === 'fp1' && hasFP1 && (
            <FreePracticeSection session="FP1" data={fp1Data} />
          )}

          {activeTab === 'fp2' && hasFP2 && (
            <FreePracticeSection session="FP2" data={fp2Data} />
          )}

          {activeTab === 'fp3' && hasFP3 && (
            <FreePracticeSection session="FP3" data={fp3Data} />
          )}

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

// Free Practice Section Component
function FreePracticeSection({ session, data }: { session: string; data: FreePractice[] }) {
  const top3 = data.filter(fp => fp.position <= 3);
  const rest = data.filter(fp => fp.position > 3);

  const p1 = top3.find(fp => fp.position === 1);
  const p2 = top3.find(fp => fp.position === 2);
  const p3 = top3.find(fp => fp.position === 3);

  return (
    <div className="space-y-8">
      {/* Top 3 podium-style cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {p2 && <FPPodiumCard fp={p2} />}
          {p1 && <FPPodiumCard fp={p1} isWinner />}
          {p3 && <FPPodiumCard fp={p3} />}
        </div>
      )}

      {/* P4+ results table */}
      {rest.length > 0 && (
        <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-f1-red" />
            {session} Results
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Pos</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Driver</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Team</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold">Best Lap</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold">Gap</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold">Laps</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((fp) => (
                  <tr
                    key={fp.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: fp.constructor.team_color || '#ef4444',
                    }}
                  >
                    <td className="py-4 px-4">
                      <span className="font-bold text-white text-lg">{fp.position}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-semibold text-white">
                          {fp.driver.first_name} {fp.driver.last_name}
                        </div>
                        <div className="text-sm text-gray-400">{fp.driver.code}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-300">{fp.constructor.name}</td>
                    <td className="py-4 px-4 text-right text-gray-300 font-mono">
                      {fp.best_lap_time || '-'}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-300 font-mono">
                      {fp.gap_to_leader || '-'}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-300">
                      {fp.laps}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// FP Podium Card — mirrors QualifyingPodiumCard
function FPPodiumCard({ fp, isWinner = false }: { fp: FreePractice; isWinner?: boolean }) {
  const positionStyles: Record<number, { bg: string; border: string; text: string; glow: string }> = {
    1: {
      bg: 'from-yellow-500/20 via-yellow-700/10 to-transparent',
      border: 'border-yellow-400',
      text: 'text-yellow-400',
      glow: 'shadow-yellow-400/20 shadow-lg',
    },
    2: {
      bg: 'from-gray-300/20 via-gray-500/10 to-transparent',
      border: 'border-gray-300',
      text: 'text-gray-300',
      glow: '',
    },
    3: {
      bg: 'from-orange-500/20 via-orange-700/10 to-transparent',
      border: 'border-orange-500',
      text: 'text-orange-500',
      glow: '',
    },
  };

  const style = positionStyles[fp.position] || positionStyles[1];
  const teamColor = fp.constructor.team_color || '#ef4444';

  return (
    <div
      className={`relative bg-gradient-to-b ${style.bg} backdrop-blur-sm rounded-xl border-2 ${style.border} ${style.glow} transition-transform hover:scale-[1.03] ${isWinner ? 'md:-mt-6 md:pb-8' : ''}`}
      style={{ borderLeftWidth: '6px', borderLeftColor: teamColor }}
    >
      <div className="flex justify-center pt-6 pb-2">
        <span className={`font-black ${isWinner ? 'text-8xl' : 'text-6xl'} ${style.text} leading-none drop-shadow-lg`}>
          P{fp.position}
        </span>
      </div>

      <div className="text-center px-4 pb-2">
        <h3 className={`font-bold text-white ${isWinner ? 'text-2xl' : 'text-xl'}`}>
          {fp.driver.first_name}
        </h3>
        <h3 className={`font-black text-white uppercase ${isWinner ? 'text-3xl' : 'text-2xl'} tracking-wide`}>
          {fp.driver.last_name}
        </h3>
        <p className="text-gray-400 font-semibold text-sm mt-1" style={{ color: teamColor }}>
          {fp.constructor.name}
        </p>
      </div>

      {fp.best_lap_time && (
        <div className="text-center mt-3 mb-2">
          <span className={`font-mono font-bold ${isWinner ? 'text-2xl' : 'text-xl'} text-white`}>
            {fp.best_lap_time}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 px-4 pb-5 mt-2">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Laps</div>
          <div className="text-xs font-mono text-gray-300 mt-0.5">{fp.laps}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Gap</div>
          <div className="text-xs font-mono text-gray-300 mt-0.5">{fp.gap_to_leader || '-'}</div>
        </div>
      </div>
    </div>
  );
}

// Qualifying Section Component — Podium-style layout
function QualifyingSection({ qualifying }: { qualifying: Qualifying[] }) {
  // Sort by position to ensure correct order
  const sorted = [...qualifying].sort((a, b) => a.position - b.position);
  const top3 = sorted.filter(q => q.position <= 3);
  const rest = sorted.filter(q => q.position > 3);

  // Arrange top 3: P2 (left), P1 (center), P3 (right)
  const p1 = top3.find(q => q.position === 1);
  const p2 = top3.find(q => q.position === 2);
  const p3 = top3.find(q => q.position === 3);

  // Helper: best time for a qualifying entry (last session completed)
  const getBestTime = (q: Qualifying) => q.q3_time || q.q2_time || q.q1_time || null;

  return (
    <div className="space-y-8">
      {/* Top 3 podium-style cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* P2 — Left */}
          {p2 && (
            <QualifyingPodiumCard qualifying={p2} bestTime={getBestTime(p2)} />
          )}
          {/* P1 — Center, larger */}
          {p1 && (
            <QualifyingPodiumCard qualifying={p1} bestTime={getBestTime(p1)} isWinner />
          )}
          {/* P3 — Right */}
          {p3 && (
            <QualifyingPodiumCard qualifying={p3} bestTime={getBestTime(p3)} />
          )}
        </div>
      )}

      {/* P4+ results table */}
      {rest.length > 0 && (
        <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Timer className="w-6 h-6 text-f1-red" />
            Qualifying Results
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
                {rest.map((q) => (
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
      )}
    </div>
  );
}

// Qualifying Podium Card for top 3
function QualifyingPodiumCard({ qualifying: q, bestTime, isWinner = false }: { qualifying: Qualifying; bestTime: string | null; isWinner?: boolean }) {
  const positionStyles: Record<number, { bg: string; border: string; text: string; glow: string }> = {
    1: {
      bg: 'from-yellow-500/20 via-yellow-700/10 to-transparent',
      border: 'border-yellow-400',
      text: 'text-yellow-400',
      glow: 'shadow-yellow-400/20 shadow-lg',
    },
    2: {
      bg: 'from-gray-300/20 via-gray-500/10 to-transparent',
      border: 'border-gray-300',
      text: 'text-gray-300',
      glow: '',
    },
    3: {
      bg: 'from-orange-500/20 via-orange-700/10 to-transparent',
      border: 'border-orange-500',
      text: 'text-orange-500',
      glow: '',
    },
  };

  const style = positionStyles[q.position] || positionStyles[1];
  const teamColor = q.constructor.team_color || '#ef4444';

  return (
    <div
      className={`relative bg-gradient-to-b ${style.bg} backdrop-blur-sm rounded-xl border-2 ${style.border} ${style.glow} transition-transform hover:scale-[1.03] ${isWinner ? 'md:-mt-6 md:pb-8' : ''}`}
      style={{ borderLeftWidth: '6px', borderLeftColor: teamColor }}
    >
      {/* Position number */}
      <div className="flex justify-center pt-6 pb-2">
        <span className={`font-black ${isWinner ? 'text-8xl' : 'text-6xl'} ${style.text} leading-none drop-shadow-lg`}>
          P{q.position}
        </span>
      </div>

      {/* Driver info */}
      <div className="text-center px-4 pb-2">
        <h3 className={`font-bold text-white ${isWinner ? 'text-2xl' : 'text-xl'}`}>
          {q.driver.first_name}
        </h3>
        <h3 className={`font-black text-white uppercase ${isWinner ? 'text-3xl' : 'text-2xl'} tracking-wide`}>
          {q.driver.last_name}
        </h3>
        <p className="text-gray-400 font-semibold text-sm mt-1" style={{ color: teamColor }}>
          {q.constructor.name}
        </p>
      </div>

      {/* Best lap time — prominent */}
      {bestTime && (
        <div className="text-center mt-3 mb-2">
          <span className={`font-mono font-bold ${isWinner ? 'text-2xl' : 'text-xl'} text-white`}>
            {bestTime}
          </span>
        </div>
      )}

      {/* Q1 / Q2 / Q3 breakdown */}
      <div className="grid grid-cols-3 gap-1 px-4 pb-5 mt-2">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Q1</div>
          <div className="text-xs font-mono text-gray-300 mt-0.5">{q.q1_time || '-'}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Q2</div>
          <div className="text-xs font-mono text-gray-300 mt-0.5">{q.q2_time || '-'}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Q3</div>
          <div className="text-xs font-mono text-gray-300 mt-0.5">{q.q3_time || '-'}</div>
        </div>
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

// Race Results Section — Podium-style layout matching Qualifying
function RaceResultsSection({ results }: { results: Result[] }) {
  // Sort by final_position, DNFs/DSQs/DNS at the end
  const sorted = [...results].sort((a, b) => {
    if (a.final_position && b.final_position) return a.final_position - b.final_position;
    if (a.final_position) return -1;
    if (b.final_position) return 1;
    return 0;
  });

  const top3 = sorted.filter(r => r.final_position && r.final_position <= 3);
  const rest = sorted.filter(r => !r.final_position || r.final_position > 3);

  // Arrange top 3: P2 (left), P1 (center), P3 (right)
  const p1 = top3.find(r => r.final_position === 1);
  const p2 = top3.find(r => r.final_position === 2);
  const p3 = top3.find(r => r.final_position === 3);

  // Helper: display text for result (points + status)
  const getResultDisplay = (r: Result) => {
    if (r.status === 'finished' || r.status === 'dnf' && r.final_position) {
      return r.points > 0 ? `${r.points} pts` : null;
    }
    return null;
  };

  // Helper: status label for non-finishers
  const getStatusLabel = (r: Result) => {
    if (r.status === 'retired' || r.status === 'dnf') return 'DNF';
    if (r.status === 'dsq') return 'DSQ';
    if (r.status === 'dns') return 'DNS';
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Top 3 podium-style cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* P2 — Left */}
          {p2 && <RacePodiumCard result={p2} />}
          {/* P1 — Center, larger */}
          {p1 && <RacePodiumCard result={p1} isWinner />}
          {/* P3 — Right */}
          {p3 && <RacePodiumCard result={p3} />}
        </div>
      )}

      {/* P4+ results table */}
      {rest.length > 0 && (
        <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Flag className="w-6 h-6 text-f1-red" />
            Race Results
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Pos</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Driver</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Team</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold">Points</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((r) => {
                  const statusLabel = getStatusLabel(r);
                  const isNotFinished = !!statusLabel;

                  return (
                    <tr
                      key={r.id}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                      style={{
                        borderLeftWidth: '4px',
                        borderLeftColor: r.constructor.team_color || '#ef4444',
                      }}
                    >
                      <td className="py-4 px-4">
                        <span className="font-bold text-white text-lg">
                          {r.position_text}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-semibold text-white">
                            {r.driver.first_name} {r.driver.last_name}
                          </div>
                          <div className="text-sm text-gray-400">{r.driver.code}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        {r.constructor.name}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-gray-300">
                        {r.points > 0 ? (
                          <span className="text-white font-bold">{r.points}</span>
                        ) : (
                          <span className="text-gray-500">0</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {isNotFinished ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="px-2 py-0.5 bg-red-900/40 text-red-400 rounded text-xs font-bold border border-red-500/30">
                              {statusLabel}
                            </span>
                            {r.retirement_reason && (
                              <span className="text-xs text-gray-500 mt-0.5">{r.retirement_reason}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-green-400 text-xs font-semibold">Finished</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Race Podium Card — mirrors QualifyingPodiumCard exactly
function RacePodiumCard({ result: r, isWinner = false }: { result: Result; isWinner?: boolean }) {
  const position = r.final_position || 0;

  const positionStyles: Record<number, { bg: string; border: string; text: string; glow: string }> = {
    1: {
      bg: 'from-yellow-500/20 via-yellow-700/10 to-transparent',
      border: 'border-yellow-400',
      text: 'text-yellow-400',
      glow: 'shadow-yellow-400/20 shadow-lg',
    },
    2: {
      bg: 'from-gray-300/20 via-gray-500/10 to-transparent',
      border: 'border-gray-300',
      text: 'text-gray-300',
      glow: '',
    },
    3: {
      bg: 'from-orange-500/20 via-orange-700/10 to-transparent',
      border: 'border-orange-500',
      text: 'text-orange-500',
      glow: '',
    },
  };

  const style = positionStyles[position] || positionStyles[1];
  const teamColor = r.constructor.team_color || '#ef4444';

  return (
    <div
      className={`relative bg-gradient-to-b ${style.bg} backdrop-blur-sm rounded-xl border-2 ${style.border} ${style.glow} transition-transform hover:scale-[1.03] ${isWinner ? 'md:-mt-6 md:pb-8' : ''}`}
      style={{ borderLeftWidth: '6px', borderLeftColor: teamColor }}
    >
      {/* Position number */}
      <div className="flex justify-center pt-6 pb-2">
        <span className={`font-black ${isWinner ? 'text-8xl' : 'text-6xl'} ${style.text} leading-none drop-shadow-lg`}>
          P{position}
        </span>
      </div>

      {/* Driver info */}
      <div className="text-center px-4 pb-2">
        <h3 className={`font-bold text-white ${isWinner ? 'text-2xl' : 'text-xl'}`}>
          {r.driver.first_name}
        </h3>
        <h3 className={`font-black text-white uppercase ${isWinner ? 'text-3xl' : 'text-2xl'} tracking-wide`}>
          {r.driver.last_name}
        </h3>
        <p className="text-gray-400 font-semibold text-sm mt-1" style={{ color: teamColor }}>
          {r.constructor.name}
        </p>
      </div>

      {/* Points — prominent */}
      {r.points > 0 && (
        <div className="text-center mt-3 mb-2">
          <span className={`font-mono font-bold ${isWinner ? 'text-2xl' : 'text-xl'} text-white`}>
            {r.points} pts
          </span>
        </div>
      )}

      {/* Details breakdown: Laps / Fastest Lap / Grid */}
      <div className="grid grid-cols-3 gap-1 px-4 pb-5 mt-2">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Grid</div>
          <div className="text-xs font-mono text-gray-300 mt-0.5">P{r.grid_position}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Laps</div>
          <div className="text-xs font-mono text-gray-300 mt-0.5">{r.laps_completed}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Fastest</div>
          <div className="text-xs font-mono text-gray-300 mt-0.5">{r.fastest_lap_time || '-'}</div>
        </div>
      </div>
    </div>
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
