'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { f1Api } from '@/lib/api';
import { Race, Result, Lap } from '@/types/f1';
import { ArrowLeft, Zap, Loader2, ChevronDown, TrendingUp, AlertCircle, CheckCircle, Wind, Thermometer, Radio } from 'lucide-react';
import { useSeason } from '@/contexts/SeasonContext';
import { predictRace, compareWithActual, PredictionResult, PredictionFilters, TyreCompound, LapInput } from '@/lib/predictionEngine';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { filterCancelledRaces } from '@/lib/raceFilters';
import { getRaceWeekendData } from '@/lib/raceWeekendData';

export default function PredictionsPage() {
  const { currentSeason } = useSeason();
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [actualResults, setActualResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [filters, setFilters] = useState<PredictionFilters>({
    session: 'FP2',
    tyreCompound: 'UNKNOWN',
    minLap: 1,
    maxLap: 60,
    minStintLength: 3,
    includeOutliers: false,
  });

  useEffect(() => {
    loadRaces();
  }, [currentSeason]);

  const loadRaces = async () => {
    try {
      setLoading(true);
      const response = await f1Api.getRaces({ season: currentSeason });
      let allRaces = response.data.results || response.data;
      let nextUrl = response.data.next;
      while (nextUrl) {
        const nextRes = await fetch(nextUrl);
        const nextData = await nextRes.json();
        allRaces = [...allRaces, ...(nextData.results || [])];
        nextUrl = nextData.next;
      }
      const raceList: Race[] = filterCancelledRaces(Array.isArray(allRaces) ? allRaces : []).sort(
        (a: Race, b: Race) => a.round - b.round
      );
      setRaces(raceList);
      if (raceList.length > 0) {
        // Default to next upcoming race or last race
        const now = new Date();
        const upcoming = raceList.find((r) => new Date(r.date) >= now);
        const lastPast = raceList.filter((r) => new Date(r.date) < now).pop();
        setSelectedRaceId((upcoming || lastPast || raceList[0]).id);
      }
    } catch (err) {
      console.error('Error loading races:', err);
    } finally {
      setLoading(false);
    }
  };

  const runPrediction = async () => {
    if (!selectedRaceId) return;
    
    try {
      setPredicting(true);
      setPrediction(null);
      setActualResults([]);
      setShowComparison(false);

      const selectedRace = races.find(r => r.id === selectedRaceId);
      if (!selectedRace) return;

      // Fetch and map qualifying + free practice data by driver/team
      const weekendData = await getRaceWeekendData(selectedRaceId);
      const qualifying = weekendData.qualifying;
      const freePractice = weekendData.freePractice;

      // Fetch previous race results for historical data
      const previousResults: Result[][] = [];
      const prevRaces = races
        .filter(r => r.round < selectedRace.round)
        .sort((a, b) => b.round - a.round) // Most recent first
        .slice(0, 5); // Last 5 races

      for (const prevRace of prevRaces) {
        try {
          const resRes = await f1Api.getResults({ race: prevRace.id });
          const results = resRes.data.results || resRes.data;
          if (Array.isArray(results) && results.length > 0) {
            previousResults.push(results);
          }
        } catch { /* skip */ }
      }

      // Fetch lap-by-lap data for race pace simulation
      let lapData: LapInput[] = [];
      try {
        const lapRes = await f1Api.getLaps({ race: selectedRaceId });
        const laps = (lapRes.data.results || lapRes.data || []) as Lap[];

        const maxLapByDriver = new Map<number, number>();
        laps.forEach((lap) => {
          const max = maxLapByDriver.get(lap.driver.id) || 0;
          if (lap.lap_number > max) maxLapByDriver.set(lap.driver.id, lap.lap_number);
        });

        const teamByDriver = new Map<number, { teamName: string; teamColor: string | null }>();
        previousResults.flat().forEach((result) => {
          teamByDriver.set(result.driver.id, {
            teamName: result.constructor.name,
            teamColor: result.constructor.team_color,
          });
        });
        weekendData.byDriver.forEach((driverData, driverId) => {
          teamByDriver.set(driverId, {
            teamName: driverData.teamName,
            teamColor: driverData.teamColor,
          });
        });

        lapData = laps
          .filter((lap) => Number.isFinite(lap.lap_time_milliseconds) && Boolean(lap.lap_time_milliseconds))
          .map((lap) => {
            const team = teamByDriver.get(lap.driver.id);
            const maxLap = maxLapByDriver.get(lap.driver.id) || lap.lap_number;
            return {
              driverId: lap.driver.id,
              driverName: `${lap.driver.first_name} ${lap.driver.last_name}`,
              driverCode: lap.driver.code,
              teamName: team?.teamName || 'Unknown Team',
              teamColor: team?.teamColor || '#E10600',
              lapTimeMs: lap.lap_time_milliseconds || 0,
              lapNumber: lap.lap_number,
              tyreCompound: 'UNKNOWN' as TyreCompound,
              session: 'FP2',
              isOutLap: lap.lap_number === 1,
              isInLap: lap.lap_number === maxLap,
            };
          });
      } catch {
        lapData = [];
      }

      // Collect circuit IDs of previous races for affinity scoring
      const previousRaceCircuitIds = prevRaces.map((r) => r.circuit_id).filter(Boolean);

      // Run prediction engine
      const result = predictRace(
        {
          qualifying,
          freePractice,
          previousResults: previousResults.reverse(), // Chronological order
          lapData,
          filters,
          totalLaps: selectedRace.round > 0 ? 58 : 56,
          circuitId: selectedRace.circuit_id,
        },
        previousRaceCircuitIds
      );

      setPrediction(result);

      // Check if actual results exist
      try {
        const actualRes = await f1Api.getResults({ race: selectedRaceId });
        const actual = actualRes.data.results || actualRes.data;
        if (Array.isArray(actual) && actual.length > 0) {
          setActualResults(actual);
        }
      } catch { /* no actual results */ }

    } catch (err) {
      console.error('Error running prediction:', err);
    } finally {
      setPredicting(false);
    }
  };

  useEffect(() => {
    if (selectedRaceId) {
      runPrediction();
    }
  }, [selectedRaceId, filters]);

  const selectedRace = races.find(r => r.id === selectedRaceId);
  const comparison = prediction && actualResults.length > 0
    ? compareWithActual(prediction.predictions, actualResults)
    : null;

  const confidenceColors = {
    low: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500/30' },
    medium: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    high: { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500/30' },
  };

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
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-f1-red" />
            <h1 className="text-4xl font-bold text-white">Race Predictions</h1>
          </div>
          <p className="text-gray-300">
            AI-powered predictions based on qualifying, practice, and historical data for the {currentSeason} season
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-900/30 border border-yellow-600/40 text-yellow-300">
              <AlertCircle className="w-3 h-3" />
              {currentSeason} season data only — prior seasons not comparable (new regulations)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-900/30 border border-yellow-600/40 text-yellow-300">
              <AlertCircle className="w-3 h-3" />
              Assumes green flag racing — Safety Cars and VSC can significantly alter results
            </span>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton type="row" count={5} />
        ) : (
          <>
            {/* Race Selector */}
            <div className="mb-8 flex flex-col md:flex-row gap-4 items-start">
              <div className="relative flex-1 max-w-md">
                <select
                  value={selectedRaceId || ''}
                  onChange={(e) => setSelectedRaceId(Number(e.target.value))}
                  className="w-full px-4 py-3 pr-10 border border-gray-600 rounded-lg bg-gray-900/80 backdrop-blur-sm text-white focus:ring-2 focus:ring-f1-red focus:border-transparent outline-none appearance-none cursor-pointer"
                >
                  {races.map((race) => {
                    const isPast = new Date(race.date) < new Date();
                    return (
                      <option key={race.id} value={race.id}>
                        R{race.round} – {race.race_name} {isPast ? '(Completed)' : '(Upcoming)'}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>

              {actualResults.length > 0 && (
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    showComparison
                      ? 'bg-f1-red text-white'
                      : 'bg-gray-800/60 text-gray-300 border border-gray-600 hover:border-f1-red'
                  }`}
                >
                  <TrendingUp className="w-5 h-5 inline mr-2" />
                  {showComparison ? 'Hide Comparison' : 'Compare with Actual'}
                </button>
              )}
            </div>

            {/* Pace Filters */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 p-4 bg-gray-900/70 rounded-xl border border-gray-700/40">
              <select
                value={filters.session || 'FP2'}
                onChange={(e) => setFilters((prev) => ({ ...prev, session: e.target.value as 'FP1' | 'FP2' | 'FP3' }))}
                className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm"
              >
                <option value="FP1">FP1</option>
                <option value="FP2">FP2</option>
                <option value="FP3">FP3</option>
              </select>

              <select
                value={filters.tyreCompound || 'UNKNOWN'}
                onChange={(e) => setFilters((prev) => ({ ...prev, tyreCompound: e.target.value as TyreCompound }))}
                className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm"
              >
                <option value="UNKNOWN">All Tyres</option>
                <option value="SOFT">Soft</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>

              <input
                type="number"
                min={1}
                max={80}
                value={filters.minLap || 1}
                onChange={(e) => setFilters((prev) => ({ ...prev, minLap: Number(e.target.value) || 1 }))}
                className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm"
                placeholder="Min lap"
              />

              <input
                type="number"
                min={1}
                max={80}
                value={filters.maxLap || 60}
                onChange={(e) => setFilters((prev) => ({ ...prev, maxLap: Number(e.target.value) || 60 }))}
                className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm"
                placeholder="Max lap"
              />

              <input
                type="number"
                min={3}
                max={20}
                value={filters.minStintLength || 3}
                onChange={(e) => setFilters((prev) => ({ ...prev, minStintLength: Number(e.target.value) || 3 }))}
                className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm"
                placeholder="Min stint"
              />

              <label className="inline-flex items-center gap-2 px-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={Boolean(filters.includeOutliers)}
                  onChange={(e) => setFilters((prev) => ({ ...prev, includeOutliers: e.target.checked }))}
                />
                Outliers
              </label>
            </div>

            {/* Prediction Info */}
            {prediction && (
              <div className="mb-6 space-y-3">
                <div className="flex flex-wrap gap-3 items-center">
                  {/* Overall Confidence */}
                  <div className={`px-4 py-2 rounded-lg border ${confidenceColors[prediction.overallConfidence].bg} ${confidenceColors[prediction.overallConfidence].border}`}>
                    <span className={`text-sm font-bold ${confidenceColors[prediction.overallConfidence].text}`}>
                      {prediction.overallConfidence.toUpperCase()} CONFIDENCE
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Sources: {prediction.dataSourcesUsed.join(', ') || 'None'}
                  </div>
                </div>

                {/* Circuit profile badges */}
                {prediction.circuitProfile && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Circuit:</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      prediction.circuitProfile.aeroLoad === 'high' ? 'bg-blue-900/40 border-blue-500/40 text-blue-300' :
                      prediction.circuitProfile.aeroLoad === 'low' ? 'bg-orange-900/40 border-orange-500/40 text-orange-300' :
                      'bg-gray-800 border-gray-600 text-gray-300'
                    }`}>
                      <Wind className="w-3 h-3 inline mr-1" />
                      Aero {prediction.circuitProfile.aeroLoad}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      prediction.circuitProfile.tireWear === 'high' ? 'bg-red-900/40 border-red-500/40 text-red-300' :
                      prediction.circuitProfile.tireWear === 'low' ? 'bg-green-900/40 border-green-500/40 text-green-300' :
                      'bg-gray-800 border-gray-600 text-gray-300'
                    }`}>
                      <Thermometer className="w-3 h-3 inline mr-1" />
                      Tyre wear {prediction.circuitProfile.tireWear}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      prediction.circuitProfile.powerSensitivity === 'high' ? 'bg-yellow-900/40 border-yellow-500/40 text-yellow-300' :
                      prediction.circuitProfile.powerSensitivity === 'low' ? 'bg-purple-900/40 border-purple-500/40 text-purple-300' :
                      'bg-gray-800 border-gray-600 text-gray-300'
                    }`}>
                      <Radio className="w-3 h-3 inline mr-1" />
                      Power {prediction.circuitProfile.powerSensitivity}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      prediction.circuitProfile.overtakingDifficulty === 'hard' ? 'bg-red-900/40 border-red-500/40 text-red-300' :
                      prediction.circuitProfile.overtakingDifficulty === 'easy' ? 'bg-green-900/40 border-green-500/40 text-green-300' :
                      'bg-gray-800 border-gray-600 text-gray-300'
                    }`}>
                      Overtaking {prediction.circuitProfile.overtakingDifficulty}
                    </span>
                    {prediction.circuitProfile.streetCircuit && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-indigo-900/40 border-indigo-500/40 text-indigo-300">
                        Street Circuit
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      prediction.circuitProfile.safetyCarLikelihood === 'high'
                        ? 'bg-yellow-900/40 border-yellow-500/40 text-yellow-300'
                        : prediction.circuitProfile.safetyCarLikelihood === 'medium'
                        ? 'bg-gray-800 border-gray-600 text-gray-300'
                        : 'bg-green-900/40 border-green-500/40 text-green-300'
                    }`}>
                      SC risk {prediction.circuitProfile.safetyCarLikelihood}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Predicting State */}
            {predicting && (
              <div className="flex items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-f1-red" />
                <span className="text-gray-300 text-lg">Calculating prediction...</span>
              </div>
            )}

            {/* Prediction Results */}
            {prediction && !predicting && (
              <div className="space-y-2 stagger-children">
                {prediction.predictions.map((pred) => {
                  const comp = comparison?.find(c => c.driverId === pred.driverId);
                  const confStyle = confidenceColors[pred.confidence];
                  const maxScore = prediction.predictions[0]?.score || 1;
                  const barWidth = (pred.score / maxScore) * 100;

                  return (
                    <div
                      key={pred.driverId}
                      className="relative overflow-hidden rounded-lg bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 hover:border-gray-600 transition-all group"
                    >
                      {/* Team color bar background */}
                      <div
                        className="absolute inset-y-0 left-0 f1-bar opacity-15 group-hover:opacity-25 transition-opacity"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: pred.teamColor || '#E10600',
                        }}
                      />

                      <div className="relative z-10 flex items-center gap-4 p-4">
                        {/* Position */}
                        <div className="w-12 text-center flex-shrink-0">
                          <span className={`text-2xl font-black ${
                            pred.predictedPosition === 1 ? 'text-yellow-400' :
                            pred.predictedPosition === 2 ? 'text-gray-300' :
                            pred.predictedPosition === 3 ? 'text-orange-500' :
                            'text-white'
                          }`}>
                            P{pred.predictedPosition}
                          </span>
                        </div>

                        {/* Team color indicator */}
                        <div 
                          className="w-1 h-10 rounded-full flex-shrink-0"
                          style={{ backgroundColor: pred.teamColor || '#E10600' }}
                        />

                        {/* Driver info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white text-lg truncate">{pred.driverName}</div>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span>{pred.teamName}</span>
                            <span className="text-gray-600">•</span>
                            <span className="font-mono">{pred.driverCode}</span>
                          </div>
                        </div>

                        {/* Data points */}
                        <div className="hidden md:flex items-center gap-4 text-xs text-gray-500">
                          {pred.qualyPosition && (
                            <div className="text-center">
                              <div className="text-gray-400 font-semibold">Q</div>
                              <div className="text-white font-bold">P{pred.qualyPosition}</div>
                            </div>
                          )}
                          {pred.avgPracticePosition && (
                            <div className="text-center">
                              <div className="text-gray-400 font-semibold">FP</div>
                              <div className="text-white font-bold">P{pred.avgPracticePosition}</div>
                            </div>
                          )}
                          {pred.historicalAvgPosition && (
                            <div className="text-center">
                              <div className="text-gray-400 font-semibold">Hist</div>
                              <div className="text-white font-bold">P{pred.historicalAvgPosition}</div>
                            </div>
                          )}
                          <div className="text-center">
                            <div className="text-gray-400 font-semibold">Pace</div>
                            <div className="text-white font-bold">{(pred.racePaceMs / 1000).toFixed(3)}s</div>
                          </div>
                        </div>

                        {/* Confidence badge */}
                        <div className={`px-2 py-1 rounded text-xs font-bold ${confStyle.bg} ${confStyle.text} ${confStyle.border} border flex-shrink-0`}>
                          {pred.confidence.toUpperCase()}
                        </div>

                        {/* Comparison with actual */}
                        {showComparison && comp && (
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <div className="text-center">
                              <div className="text-[10px] text-gray-500 uppercase">Actual</div>
                              <div className="text-lg font-bold text-white">P{comp.actual}</div>
                            </div>
                            <div className={`text-sm font-bold ${
                              comp.difference === 0 ? 'text-green-400' :
                              comp.difference > 0 ? 'text-green-400' :
                              'text-red-400'
                            }`}>
                              {comp.difference === 0 ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : comp.difference > 0 ? (
                                <span>▲{Math.abs(comp.difference)}</span>
                              ) : (
                                <span>▼{Math.abs(comp.difference)}</span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-gray-400 min-w-[72px] text-right">
                          +{(pred.gapToLeaderMs / 1000).toFixed(2)}s
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* No data warning */}
            {prediction && prediction.predictions.length === 0 && !predicting && (
              <div className="text-center py-20 bg-gray-900/80 rounded-xl border border-gray-700">
                <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-xl text-gray-300">No prediction data available</p>
                <p className="text-gray-500 mt-2">
                  This race may not have enough data (qualifying, practice, or previous results) to generate predictions.
                </p>
              </div>
            )}

            {/* Methodology */}
            <div className="mt-12 bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-f1-red" />
                Prediction Methodology
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-400">
                <div className="p-3 bg-gray-800/40 rounded-lg">
                  <div className="font-bold text-white mb-1">Qualifying (20–45%)</div>
                  <p>Weight increases on low-overtaking circuits (Monaco 45%) and drops on DRS tracks (Monza 20%).</p>
                </div>
                <div className="p-3 bg-gray-800/40 rounded-lg">
                  <div className="font-bold text-white mb-1">Race Pace (25–55%)</div>
                  <p>Based on lap data stints and free practice. More relevant on high-overtaking circuits.</p>
                </div>
                <div className="p-3 bg-gray-800/40 rounded-lg">
                  <div className="font-bold text-white mb-1">Tyre Consistency (6–18%)</div>
                  <p>Weight increases at high tire-wear circuits like Bahrain or Spain.</p>
                </div>
                <div className="p-3 bg-gray-800/40 rounded-lg">
                  <div className="font-bold text-white mb-1">Team Circuit Affinity (7%)</div>
                  <p>How the whole team (including teammates) performed at similar circuit types this season.</p>
                </div>
                <div className="p-3 bg-gray-800/40 rounded-lg">
                  <div className="font-bold text-white mb-1">PU Affinity (3–9%)</div>
                  <p>At power-sensitive circuits (Monza, Baku, Spa), teams sharing the same engine supplier get a collective boost based on their performance at similar tracks.</p>
                </div>
                <div className="p-3 bg-gray-800/40 rounded-lg">
                  <div className="font-bold text-white mb-1">Recent Form (5–15%)</div>
                  <p>Last 5 race results with exponential decay — most recent carries highest weight.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
