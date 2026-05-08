'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { f1Api } from '@/lib/api';
import { Race, Result, Qualifying, Sprint, FreePractice, ProgressiveStandingsResponse } from '@/types/f1';
import { ArrowLeft, Calendar, MapPin, Loader2, Trophy, Timer, Flag, AlertCircle, Activity, Zap } from 'lucide-react';
import { predictRace, compareWithActual, PredictionResult } from '@/lib/predictionEngine';
import { filterCancelledRaces, isCancelledRace } from '@/lib/raceFilters';
import { getRaceWeekendData } from '@/lib/raceWeekendData';

export default function RaceDetailPage() {
  const params = useParams();
  const raceId = params.id as string;

  const [race, setRace] = useState<Race | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [qualifying, setQualifying] = useState<Qualifying[]>([]);
  const [sprint, setSprint] = useState<Sprint[]>([]);
  const [freePractice, setFreePractice] = useState<FreePractice[]>([]);
  const [progressiveStandings, setProgressiveStandings] = useState<ProgressiveStandingsResponse | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fp1' | 'fp2' | 'fp3' | 'qualifying' | 'sprint' | 'race' | 'standings' | 'prediction'>('race');
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
      if (isCancelledRace(raceData)) {
        setError(`${raceData.race_name} was cancelled and is excluded from analytics.`);
        setLoading(false);
        return;
      }
      setRace(raceData);

      // Load results
      const resultsResponse = await f1Api.getResults({ race: parseInt(raceId) });
      const allResults = resultsResponse.data.results || resultsResponse.data;
      setResults(allResults);

      // Load qualifying
      const weekendData = await getRaceWeekendData(parseInt(raceId));
      const qualifyingData = weekendData.qualifying;
      const fpData = weekendData.freePractice;
      setQualifying(qualifyingData);
      setFreePractice(fpData);

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
        try {
          const standingsResponse = await f1Api.getProgressiveStandings({
            season: raceData.season,
            round: raceData.round,
            type: 'driver'
          });
          setProgressiveStandings(standingsResponse.data);
        } catch { /* no standings */ }
      }

      // Run prediction
      if (raceData) {
        try {
          const prevRacesRes = await f1Api.getRaces({ season: raceData.season });
          let allRaces = prevRacesRes.data.results || prevRacesRes.data;
          let nextUrl = prevRacesRes.data.next;
          while (nextUrl) {
            const nextRes = await fetch(nextUrl);
            const nextData = await nextRes.json();
            allRaces = [...allRaces, ...(nextData.results || [])];
            nextUrl = nextData.next;
          }
          const prevRaces = filterCancelledRaces(allRaces as Race[])
            .filter(r => r.round < raceData.round)
            .sort((a, b) => a.round - b.round)
            .slice(-5);

          const previousResults: Result[][] = [];
          for (const pr of prevRaces) {
            try {
              const prRes = await f1Api.getResults({ race: pr.id });
              const prData = prRes.data.results || prRes.data;
              if (Array.isArray(prData) && prData.length > 0) previousResults.push(prData);
            } catch { /* skip */ }
          }

          const pred = predictRace({ qualifying: qualifyingData, freePractice: fpData, previousResults });
          setPrediction(pred);
        } catch { /* prediction failed */ }
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
            <TabButton active={activeTab === 'fp1'} onClick={() => setActiveTab('fp1')} icon={<Activity className="w-4 h-4 inline mr-2" />} label="FP1" />
          )}
          {hasFP2 && (
            <TabButton active={activeTab === 'fp2'} onClick={() => setActiveTab('fp2')} icon={<Activity className="w-4 h-4 inline mr-2" />} label="FP2" />
          )}
          {hasFP3 && (
            <TabButton active={activeTab === 'fp3'} onClick={() => setActiveTab('fp3')} icon={<Activity className="w-4 h-4 inline mr-2" />} label="FP3" />
          )}
          {hasQualifying && (
            <TabButton active={activeTab === 'qualifying'} onClick={() => setActiveTab('qualifying')} icon={<Timer className="w-4 h-4 inline mr-2" />} label="Qualifying" />
          )}
          {hasSprint && (
            <TabButton active={activeTab === 'sprint'} onClick={() => setActiveTab('sprint')} icon={<Flag className="w-4 h-4 inline mr-2" />} label="Sprint Race" />
          )}
          <TabButton active={activeTab === 'race'} onClick={() => setActiveTab('race')} icon={<Flag className="w-4 h-4 inline mr-2" />} label="Race Results" />
          {progressiveStandings && (
            <TabButton active={activeTab === 'standings'} onClick={() => setActiveTab('standings')} icon={<Trophy className="w-4 h-4 inline mr-2" />} label="Championship" />
          )}
          {prediction && prediction.predictions.length > 0 && (
            <TabButton active={activeTab === 'prediction'} onClick={() => setActiveTab('prediction')} icon={<Zap className="w-4 h-4 inline mr-2" />} label="Prediction" />
          )}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'fp1' && hasFP1 && <F1BarChartFP session="FP1" data={fp1Data} />}
          {activeTab === 'fp2' && hasFP2 && <F1BarChartFP session="FP2" data={fp2Data} />}
          {activeTab === 'fp3' && hasFP3 && <F1BarChartFP session="FP3" data={fp3Data} />}
          {activeTab === 'qualifying' && hasQualifying && <F1BarChartQualifying qualifying={qualifying} />}
          {activeTab === 'sprint' && hasSprint && <F1BarChartSprint sprint={sprint} />}
          {activeTab === 'race' && <F1BarChartRace results={results} />}
          {activeTab === 'standings' && progressiveStandings && (
            <StandingsSection
              standings={progressiveStandings}
              showAll={showAllStandings}
              onToggleShowAll={() => setShowAllStandings(!showAllStandings)}
            />
          )}
          {activeTab === 'prediction' && prediction && (
            <PredictionSection prediction={prediction} actualResults={results} />
          )}
        </div>
      </main>
    </div>
  );
}

// Reusable Tab Button
function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
        active
          ? 'bg-f1-red text-white shadow-lg shadow-red-500/20'
          : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ===================== F1-STYLE BAR CHART COMPONENTS =====================

function parseTimeToMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const clean = value.replace('+', '').trim();
  if (clean.includes(':')) {
    const [min, sec] = clean.split(':');
    const minutes = Number(min);
    const seconds = Number(sec);
    if (Number.isFinite(minutes) && Number.isFinite(seconds)) {
      return Math.round(minutes * 60000 + seconds * 1000);
    }
  }
  const seconds = Number(clean);
  if (Number.isFinite(seconds)) return Math.round(seconds * 1000);
  return null;
}

function formatGap(ms: number | null): string {
  if (ms === null || ms <= 0) return 'LEADER';
  return `+${(ms / 1000).toFixed(3)}s`;
}

// Free Practice F1 Bar Chart
function F1BarChartFP({ session, data }: { session: string; data: FreePractice[] }) {
  const top3 = data.filter(fp => fp.position <= 3);
  const p1 = top3.find(fp => fp.position === 1);
  const p2 = top3.find(fp => fp.position === 2);
  const p3 = top3.find(fp => fp.position === 3);

  const leaderMs = parseTimeToMs(p1?.best_lap_time || null);

  return (
    <div className="space-y-6">
      {/* Podium Cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {p2 && <PodiumCard name={`${p2.driver.first_name} ${p2.driver.last_name}`} code={p2.driver.code} team={p2.constructor.name} teamColor={p2.constructor.team_color} position={2} detail={p2.best_lap_time || '-'} detailLabel="Best Lap" />}
          {p1 && <PodiumCard name={`${p1.driver.first_name} ${p1.driver.last_name}`} code={p1.driver.code} team={p1.constructor.name} teamColor={p1.constructor.team_color} position={1} detail={p1.best_lap_time || '-'} detailLabel="Best Lap" isWinner />}
          {p3 && <PodiumCard name={`${p3.driver.first_name} ${p3.driver.last_name}`} code={p3.driver.code} team={p3.constructor.name} teamColor={p3.constructor.team_color} position={3} detail={p3.best_lap_time || '-'} detailLabel="Best Lap" />}
        </div>
      )}

      {/* Bar chart for all positions */}
      <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="w-6 h-6 text-f1-red" />
          {session} Results
        </h2>
        <div className="space-y-1">
          {data.map((fp, idx) => (
            (() => {
              const lapMs = parseTimeToMs(fp.best_lap_time);
              const computedGap = lapMs !== null && leaderMs !== null ? formatGap(Math.max(0, lapMs - leaderMs)) : '';
              return (
            <F1BarRow
              key={fp.id}
              position={fp.position}
              driverName={`${fp.driver.first_name} ${fp.driver.last_name}`}
              driverCode={fp.driver.code}
              teamName={fp.constructor.name}
              teamColor={fp.constructor.team_color || '#E10600'}
              value={fp.best_lap_time || '-'}
              gap={fp.gap_to_leader || computedGap}
              barPercent={100 - (idx / Math.max(data.length - 1, 1)) * 40}
              extraInfo={`${fp.laps} laps`}
            />
              );
            })()
          ))}
        </div>
      </div>
    </div>
  );
}

// Qualifying F1 Bar Chart
function F1BarChartQualifying({ qualifying }: { qualifying: Qualifying[] }) {
  const sorted = [...qualifying].sort((a, b) => a.position - b.position);
  const top3 = sorted.filter(q => q.position <= 3);
  const p1 = top3.find(q => q.position === 1);
  const p2 = top3.find(q => q.position === 2);
  const p3 = top3.find(q => q.position === 3);
  const getBestTime = (q: Qualifying) => q.q3_time || q.q2_time || q.q1_time || '-';
  const leaderMs = parseTimeToMs(getBestTime(sorted[0]));

  return (
    <div className="space-y-6">
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {p2 && <PodiumCard name={`${p2.driver.first_name} ${p2.driver.last_name}`} code={p2.driver.code} team={p2.constructor.name} teamColor={p2.constructor.team_color} position={2} detail={getBestTime(p2)} detailLabel="Best Time" subDetails={[{ label: 'Q1', value: p2.q1_time || '-' }, { label: 'Q2', value: p2.q2_time || '-' }, { label: 'Q3', value: p2.q3_time || '-' }]} />}
          {p1 && <PodiumCard name={`${p1.driver.first_name} ${p1.driver.last_name}`} code={p1.driver.code} team={p1.constructor.name} teamColor={p1.constructor.team_color} position={1} detail={getBestTime(p1)} detailLabel="Best Time" isWinner subDetails={[{ label: 'Q1', value: p1.q1_time || '-' }, { label: 'Q2', value: p1.q2_time || '-' }, { label: 'Q3', value: p1.q3_time || '-' }]} />}
          {p3 && <PodiumCard name={`${p3.driver.first_name} ${p3.driver.last_name}`} code={p3.driver.code} team={p3.constructor.name} teamColor={p3.constructor.team_color} position={3} detail={getBestTime(p3)} detailLabel="Best Time" subDetails={[{ label: 'Q1', value: p3.q1_time || '-' }, { label: 'Q2', value: p3.q2_time || '-' }, { label: 'Q3', value: p3.q3_time || '-' }]} />}
        </div>
      )}

      <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Timer className="w-6 h-6 text-f1-red" />
          Qualifying Results
        </h2>
        <div className="space-y-1">
          {sorted.map((q, idx) => (
            (() => {
              const lapMs = parseTimeToMs(getBestTime(q));
              const gap = lapMs !== null && leaderMs !== null ? formatGap(Math.max(0, lapMs - leaderMs)) : '';
              return (
            <F1BarRow
              key={q.id}
              position={q.position}
              driverName={`${q.driver.first_name} ${q.driver.last_name}`}
              driverCode={q.driver.code}
              teamName={q.constructor.name}
              teamColor={q.constructor.team_color || '#E10600'}
              value={getBestTime(q)}
              gap={gap}
              barPercent={100 - (idx / Math.max(sorted.length - 1, 1)) * 40}
              segments={[
                { label: 'Q1', value: q.q1_time || '-' },
                { label: 'Q2', value: q.q2_time || '-' },
                { label: 'Q3', value: q.q3_time || '-' },
              ]}
            />
              );
            })()
          ))}
        </div>
      </div>
    </div>
  );
}

// Sprint F1 Bar Chart
function F1BarChartSprint({ sprint }: { sprint: Sprint[] }) {
  const sorted = [...sprint].sort((a, b) => {
    if (a.final_position && b.final_position) return a.final_position - b.final_position;
    if (a.final_position) return -1;
    if (b.final_position) return 1;
    return 0;
  });

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Flag className="w-6 h-6 text-f1-red" />
        Sprint Race Results
      </h2>
      <div className="space-y-1">
        {sorted.map((s, idx) => {
          const isDNF = s.status === 'retired' || s.status === 'dnf';
          const isDNS = s.status === 'dns';
          return (
            <F1BarRow
              key={s.id}
              position={s.final_position || idx + 1}
              driverName={`${s.driver.first_name} ${s.driver.last_name}`}
              driverCode={s.driver.code}
              teamName={s.constructor.name}
              teamColor={s.constructor.team_color || '#E10600'}
              value={isDNF ? 'DNF' : isDNS ? 'DNS' : `${s.points} pts`}
              gap=""
              barPercent={isDNF || isDNS ? 20 : 100 - (idx / Math.max(sorted.length - 1, 1)) * 40}
              isRetired={isDNF || isDNS}
            />
          );
        })}
      </div>
    </div>
  );
}

// Race Results F1 Bar Chart
function F1BarChartRace({ results }: { results: Result[] }) {
  const sorted = [...results].sort((a, b) => {
    if (a.final_position && b.final_position) return a.final_position - b.final_position;
    if (a.final_position) return -1;
    if (b.final_position) return 1;
    return 0;
  });

  const top3 = sorted.filter(r => r.final_position && r.final_position <= 3);
  const p1 = top3.find(r => r.final_position === 1);
  const p2 = top3.find(r => r.final_position === 2);
  const p3 = top3.find(r => r.final_position === 3);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-900/80 rounded-xl border border-gray-700">
        <Flag className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-xl text-gray-300">No race results available yet</p>
        <p className="text-gray-500 mt-2">Results will appear after the race is completed</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {p2 && <PodiumCard name={`${p2.driver.first_name} ${p2.driver.last_name}`} code={p2.driver.code} team={p2.constructor.name} teamColor={p2.constructor.team_color} position={2} detail={`${p2.points} pts`} detailLabel="Points" subDetails={[{ label: 'Grid', value: `P${p2.grid_position}` }, { label: 'Laps', value: `${p2.laps_completed}` }, { label: 'Fastest', value: p2.fastest_lap_time || '-' }]} />}
          {p1 && <PodiumCard name={`${p1.driver.first_name} ${p1.driver.last_name}`} code={p1.driver.code} team={p1.constructor.name} teamColor={p1.constructor.team_color} position={1} detail={`${p1.points} pts`} detailLabel="Points" isWinner subDetails={[{ label: 'Grid', value: `P${p1.grid_position}` }, { label: 'Laps', value: `${p1.laps_completed}` }, { label: 'Fastest', value: p1.fastest_lap_time || '-' }]} />}
          {p3 && <PodiumCard name={`${p3.driver.first_name} ${p3.driver.last_name}`} code={p3.driver.code} team={p3.constructor.name} teamColor={p3.constructor.team_color} position={3} detail={`${p3.points} pts`} detailLabel="Points" subDetails={[{ label: 'Grid', value: `P${p3.grid_position}` }, { label: 'Laps', value: `${p3.laps_completed}` }, { label: 'Fastest', value: p3.fastest_lap_time || '-' }]} />}
        </div>
      )}

      {/* Full results bar chart */}
      <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Flag className="w-6 h-6 text-f1-red" />
          Race Classification
        </h2>
        <div className="space-y-1">
          {sorted.map((r, idx) => {
            const isDNF = r.status === 'retired' || r.status === 'dnf';
            const isDSQ = r.status === 'dsq';
            const isDNS = r.status === 'dns';
            const isNotFinished = isDNF || isDSQ || isDNS;
            const posChange = r.final_position ? r.grid_position - r.final_position : 0;

            return (
              <F1BarRow
                key={r.id}
                position={r.final_position || idx + 1}
                driverName={`${r.driver.first_name} ${r.driver.last_name}`}
                driverCode={r.driver.code}
                teamName={r.constructor.name}
                teamColor={r.constructor.team_color || '#E10600'}
                value={isNotFinished ? (isDNF ? 'DNF' : isDSQ ? 'DSQ' : 'DNS') : `${r.points} pts`}
                gap={r.fastest_lap_time || ''}
                barPercent={isNotFinished ? 20 : 100 - (idx / Math.max(sorted.length - 1, 1)) * 40}
                positionChange={posChange}
                isRetired={isNotFinished}
                retirementReason={r.retirement_reason || undefined}
                extraInfo={r.final_position ? `Grid P${r.grid_position}` : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===================== SHARED COMPONENTS =====================

// Podium Card
function PodiumCard({
  name, code, team, teamColor, position, detail, detailLabel, isWinner = false,
  subDetails
}: {
  name: string; code: string; team: string; teamColor: string | null; position: number;
  detail: string; detailLabel: string; isWinner?: boolean;
  subDetails?: { label: string; value: string }[];
}) {
  const color = teamColor || '#E10600';
  const positionStyles: Record<number, { bg: string; border: string; text: string; glow: string }> = {
    1: { bg: 'from-yellow-500/20 via-yellow-700/10 to-transparent', border: 'border-yellow-400', text: 'text-yellow-400', glow: 'shadow-yellow-400/20 shadow-lg' },
    2: { bg: 'from-gray-300/20 via-gray-500/10 to-transparent', border: 'border-gray-300', text: 'text-gray-300', glow: '' },
    3: { bg: 'from-orange-500/20 via-orange-700/10 to-transparent', border: 'border-orange-500', text: 'text-orange-500', glow: '' },
  };
  const style = positionStyles[position] || positionStyles[1];
  const nameParts = name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  return (
    <div
      className={`relative bg-gradient-to-b ${style.bg} backdrop-blur-sm rounded-xl border-2 ${style.border} ${style.glow} transition-transform hover:scale-[1.03] ${isWinner ? 'md:-mt-6 md:pb-8' : ''}`}
      style={{ borderLeftWidth: '6px', borderLeftColor: color }}
    >
      <div className="flex justify-center pt-6 pb-2">
        <span className={`font-black ${isWinner ? 'text-8xl' : 'text-6xl'} ${style.text} leading-none drop-shadow-lg`}>
          P{position}
        </span>
      </div>
      <div className="text-center px-4 pb-2">
        <h3 className={`font-bold text-white ${isWinner ? 'text-2xl' : 'text-xl'}`}>{firstName}</h3>
        <h3 className={`font-black text-white uppercase ${isWinner ? 'text-3xl' : 'text-2xl'} tracking-wide`}>{lastName}</h3>
        <p className="text-gray-400 font-semibold text-sm mt-1" style={{ color }}>{team}</p>
      </div>
      <div className="text-center mt-3 mb-2">
        <span className={`font-mono font-bold ${isWinner ? 'text-2xl' : 'text-xl'} text-white`}>{detail}</span>
      </div>
      {subDetails && (
        <div className="grid gap-1 px-4 pb-5 mt-2" style={{ gridTemplateColumns: `repeat(${subDetails.length}, minmax(0, 1fr))` }}>
          {subDetails.map((sd) => (
            <div key={sd.label} className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{sd.label}</div>
              <div className="text-xs font-mono text-gray-300 mt-0.5">{sd.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// F1-Style Horizontal Bar Row
function F1BarRow({
  position, driverName, driverCode, teamName, teamColor, value, gap,
  barPercent, positionChange, isRetired, retirementReason, extraInfo,
  segments
}: {
  position: number; driverName: string; driverCode: string; teamName: string;
  teamColor: string; value: string; gap: string; barPercent: number;
  positionChange?: number; isRetired?: boolean; retirementReason?: string;
  extraInfo?: string;
  segments?: { label: string; value: string }[];
}) {
  return (
    <div className="relative overflow-hidden rounded group hover:bg-gray-800/30 transition-colors">
      {/* Team color bar background */}
      <div
        className="absolute inset-y-0 left-0 f1-bar opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ width: `${barPercent}%`, backgroundColor: teamColor }}
      />

      <div className="relative z-10 flex items-center gap-3 py-3 px-4">
        {/* Position */}
        <div className="w-8 text-right flex-shrink-0">
          <span className={`font-black text-lg ${
            position === 1 ? 'text-yellow-400' :
            position === 2 ? 'text-gray-300' :
            position === 3 ? 'text-orange-500' :
            isRetired ? 'text-red-400' :
            'text-white'
          }`}>
            {isRetired ? '–' : position}
          </span>
        </div>

        {/* Team color bar */}
        <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: teamColor }} />

        {/* Driver info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm truncate">{driverName}</span>
            <span className="text-xs text-gray-500 font-mono">{driverCode}</span>
          </div>
          <span className="text-xs text-gray-500">{teamName}</span>
        </div>

        {/* Segments (Q1/Q2/Q3) */}
        {segments && (
          <div className="hidden lg:flex items-center gap-3">
            {segments.map((seg) => (
              <div key={seg.label} className="text-center">
                <div className="text-[9px] uppercase text-gray-600 font-bold">{seg.label}</div>
                <div className="text-xs font-mono text-gray-400">{seg.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Extra info */}
        {extraInfo && (
          <div className="text-xs text-gray-500 hidden md:block">{extraInfo}</div>
        )}

        {/* Position change indicator */}
        {positionChange !== undefined && positionChange !== 0 && !isRetired && (
          <div className={`text-xs font-bold flex-shrink-0 ${
            positionChange > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {positionChange > 0 ? `▲${positionChange}` : `▼${Math.abs(positionChange)}`}
          </div>
        )}

        {/* Value */}
        <div className={`text-right flex-shrink-0 min-w-[70px] ${isRetired ? 'text-red-400' : ''}`}>
          <span className={`font-bold text-sm ${isRetired ? 'text-red-400' : 'text-white'}`}>{value}</span>
          {retirementReason && (
            <div className="text-[10px] text-gray-600 truncate max-w-[80px]">{retirementReason}</div>
          )}
        </div>

        {/* Gap */}
        {gap && !isRetired && (
          <div className="text-xs font-mono text-gray-500 flex-shrink-0 hidden md:block min-w-[80px] text-right">
            {gap}
          </div>
        )}
      </div>
    </div>
  );
}

// Prediction Section
function PredictionSection({ prediction, actualResults }: { prediction: PredictionResult; actualResults: Result[] }) {
  const comparison = actualResults.length > 0
    ? compareWithActual(prediction.predictions, actualResults)
    : null;

  const confidenceColors = {
    low: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500/30' },
    medium: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    high: { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500/30' },
  };

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-f1-red" />
          Race Prediction
        </h2>
        <div className={`px-4 py-2 rounded-lg border ${confidenceColors[prediction.overallConfidence].bg} ${confidenceColors[prediction.overallConfidence].border}`}>
          <span className={`text-sm font-bold ${confidenceColors[prediction.overallConfidence].text}`}>
            {prediction.overallConfidence.toUpperCase()} CONFIDENCE
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {prediction.predictions.map((pred) => {
          const comp = comparison?.find(c => c.driverId === pred.driverId);
          const maxScore = prediction.predictions[0]?.score || 1;
          const barPercent = (pred.score / maxScore) * 100;

          return (
            <div key={pred.driverId} className="relative overflow-hidden rounded group hover:bg-gray-800/30 transition-colors">
              <div
                className="absolute inset-y-0 left-0 f1-bar opacity-10 group-hover:opacity-20 transition-opacity"
                style={{ width: `${barPercent}%`, backgroundColor: pred.teamColor || '#E10600' }}
              />
              <div className="relative z-10 flex items-center gap-3 py-3 px-4">
                <div className="w-8 text-right flex-shrink-0">
                  <span className={`font-black text-lg ${
                    pred.predictedPosition === 1 ? 'text-yellow-400' :
                    pred.predictedPosition === 2 ? 'text-gray-300' :
                    pred.predictedPosition === 3 ? 'text-orange-500' :
                    'text-white'
                  }`}>{pred.predictedPosition}</span>
                </div>
                <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: pred.teamColor || '#E10600' }} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm truncate">{pred.driverName}</div>
                  <div className="text-xs text-gray-500">{pred.teamName}</div>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${confidenceColors[pred.confidence].bg} ${confidenceColors[pred.confidence].text} border ${confidenceColors[pred.confidence].border}`}>
                  {pred.confidence.toUpperCase()}
                </div>
                {comp && (
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-gray-400">→ P{comp.actual}</div>
                    <div className={`text-xs font-bold ${
                      comp.difference === 0 ? 'text-green-400' :
                      Math.abs(comp.difference) <= 2 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {comp.difference === 0 ? '✓' : comp.difference > 0 ? `▼${Math.abs(comp.difference)}` : `▲${Math.abs(comp.difference)}`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Standings Section
function StandingsSection({
  standings, showAll, onToggleShowAll
}: {
  standings: ProgressiveStandingsResponse; showAll: boolean; onToggleShowAll: () => void;
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
        {displayedStandings.map((standing) => (
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
              <div className="text-2xl font-bold text-white">{standing.points}</div>
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
