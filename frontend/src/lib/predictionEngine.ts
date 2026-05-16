import { Result, Qualifying, FreePractice } from '@/types/f1';
import { getCircuitProfile, getCircuitWeights, circuitSimilarity, CircuitProfile } from '@/lib/circuitProfiles';
import { getPUSupplier, getTeamsWithSamePU } from '@/lib/puSuppliers';

export type TyreCompound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET' | 'UNKNOWN';
export type SessionType = 'FP1' | 'FP2' | 'FP3';

export interface LapInput {
  driverId: number;
  driverName: string;
  driverCode: string;
  teamName: string;
  teamColor: string | null;
  lapTimeMs: number;
  lapNumber: number;
  tyreCompound?: TyreCompound;
  session?: SessionType;
  isOutLap?: boolean;
  isInLap?: boolean;
}

export interface PredictionFilters {
  session?: SessionType;
  tyreCompound?: TyreCompound;
  minLap?: number;
  maxLap?: number;
  minStintLength?: number;
  includeOutliers?: boolean;
}

export interface PredictionInput {
  qualifying: Qualifying[];
  freePractice: FreePractice[];
  previousResults: Result[][];
  lapData?: LapInput[];
  filters?: PredictionFilters;
  totalLaps?: number;
  circuitId?: string; // circuit_id from the Race object
}

interface Stint {
  driverId: number;
  compound: TyreCompound;
  session: SessionType;
  laps: LapInput[];
  avgLapMs: number;
  variance: number;
  degradationMsPerLap: number;
}

interface DriverRaceProfile {
  driverId: number;
  racePaceMs: number;
  consistencyScore: number;
  bestLongStintMs: number;
  mostConsistentStintMs: number;
  overallAvgMs: number;
  score: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface DriverPrediction {
  driverId: number;
  driverName: string;
  driverCode: string;
  teamName: string;
  teamColor: string | null;
  predictedPosition: number;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  qualyPosition: number | null;
  avgPracticePosition: number | null;
  historicalAvgPosition: number | null;
  predictedTotalTimeMs: number;
  gapToLeaderMs: number;
  racePaceMs: number;
  consistencyScore: number;
  // New: score breakdown for transparency
  scoreBreakdown?: {
    racePace: number;
    qualifying: number;
    consistency: number;
    historical: number;
    teamCircuitAffinity: number;
    puAffinity: number;
  };
}

export interface PredictionResult {
  predictions: DriverPrediction[];
  dataSourcesUsed: string[];
  overallConfidence: 'low' | 'medium' | 'high';
  circuitProfile?: CircuitProfile | null;
}

const DEFAULT_FILTERS: Required<PredictionFilters> = {
  session: 'FP2',
  tyreCompound: 'UNKNOWN',
  minLap: 1,
  maxLap: 999,
  minStintLength: 3,
  includeOutliers: false,
};

const TYRE_WEIGHTS: Record<TyreCompound, number> = {
  HARD: 1,
  MEDIUM: 0.96,
  SOFT: 0.72,
  INTERMEDIATE: 0.55,
  WET: 0.5,
  UNKNOWN: 0.82,
};

const HISTORICAL_DECAY = 0.72;
const FUEL_CORRECTION_PER_LAP_MS = 12;

const predictionCache = new Map<string, PredictionResult>();

function normalizePosition(position: number, totalDrivers: number): number {
  if (totalDrivers <= 1) return 1;
  return 1 - (position - 1) / (totalDrivers - 1);
}

function parseLapTimeToMs(lapTime: string | null): number | null {
  if (!lapTime) return null;
  const trimmed = lapTime.trim();
  const minSec = trimmed.split(':');
  if (minSec.length === 2) {
    const minutes = Number(minSec[0]);
    const secMs = Number(minSec[1]);
    if (Number.isFinite(minutes) && Number.isFinite(secMs)) {
      return Math.round(minutes * 60000 + secMs * 1000);
    }
  }
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) return Math.round(seconds * 1000);
  return null;
}

function normalizeCompound(compound?: TyreCompound): TyreCompound {
  return compound || 'UNKNOWN';
}

export function filterLapData(laps: LapInput[], filters?: PredictionFilters): LapInput[] {
  const merged = { ...DEFAULT_FILTERS, ...filters };
  return laps.filter((lap) => {
    if (merged.session && merged.session !== 'FP2') {
      if ((lap.session || 'FP2') !== merged.session) return false;
    }
    if (merged.tyreCompound !== 'UNKNOWN' && normalizeCompound(lap.tyreCompound) !== merged.tyreCompound) {
      return false;
    }
    if (lap.lapNumber < merged.minLap || lap.lapNumber > merged.maxLap) return false;
    return true;
  });
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - avg) * (v - avg), 0) / values.length;
  return Math.sqrt(variance);
}

function slope(values: number[]): number {
  if (values.length < 2) return 0;
  let xSum = 0, ySum = 0, xySum = 0, xxSum = 0;
  for (let i = 0; i < values.length; i++) {
    const x = i + 1;
    const y = values[i];
    xSum += x; ySum += y; xySum += x * y; xxSum += x * x;
  }
  const n = values.length;
  const denominator = n * xxSum - xSum * xSum;
  if (denominator === 0) return 0;
  return (n * xySum - xSum * ySum) / denominator;
}

function cleanValidLaps(laps: LapInput[], includeOutliers: boolean): LapInput[] {
  const byDriver = new Map<number, LapInput[]>();
  for (const lap of laps) {
    if (lap.isOutLap || lap.isInLap || lap.lapTimeMs <= 0) continue;
    const existing = byDriver.get(lap.driverId) || [];
    existing.push(lap);
    byDriver.set(lap.driverId, existing);
  }

  const cleaned: LapInput[] = [];
  byDriver.forEach((driverLaps) => {
    const lapTimes = driverLaps.map((l) => l.lapTimeMs);
    const driverMedian = median(lapTimes);
    const absoluteCap = Math.round(driverMedian * 1.08);
    let kept = driverLaps.filter((lap) => lap.lapTimeMs <= absoluteCap);

    if (!includeOutliers && kept.length > 4) {
      const med = median(kept.map((l) => l.lapTimeMs));
      const deviations = kept.map((l) => Math.abs(l.lapTimeMs - med));
      const mad = median(deviations) || 1;
      kept = kept.filter((lap) => {
        const z = (0.6745 * Math.abs(lap.lapTimeMs - med)) / mad;
        return z <= 3.5;
      });
    }
    cleaned.push(...kept);
  });
  return cleaned;
}

function detectStints(laps: LapInput[], minStintLength: number): Stint[] {
  const stints: Stint[] = [];
  const byDriver = new Map<number, LapInput[]>();
  for (const lap of laps) {
    const existing = byDriver.get(lap.driverId) || [];
    existing.push(lap);
    byDriver.set(lap.driverId, existing);
  }

  byDriver.forEach((driverLaps, driverId) => {
    const sorted = [...driverLaps].sort((a, b) => a.lapNumber - b.lapNumber);
    let current: LapInput[] = [];
    for (const lap of sorted) {
      const prev = current[current.length - 1];
      const sameCompound = normalizeCompound(prev?.tyreCompound) === normalizeCompound(lap.tyreCompound);
      const sameSession = (prev?.session || 'FP2') === (lap.session || 'FP2');
      const consecutive = prev ? lap.lapNumber === prev.lapNumber + 1 : true;
      if (!prev || (sameCompound && sameSession && consecutive)) {
        current.push(lap);
      } else {
        if (current.length >= minStintLength) stints.push(buildStint(driverId, current));
        current = [lap];
      }
    }
    if (current.length >= minStintLength) stints.push(buildStint(driverId, current));
  });
  return stints;
}

function buildStint(driverId: number, laps: LapInput[]): Stint {
  const rawTimes = laps.map((lap) => {
    const fuelAdjusted = lap.lapTimeMs - Math.max(0, (90 - lap.lapNumber)) * FUEL_CORRECTION_PER_LAP_MS;
    const sessionFactor = lap.session === 'FP1' ? 1.006 : lap.session === 'FP3' ? 0.997 : 1;
    return Math.round(fuelAdjusted * sessionFactor);
  });

  return {
    driverId,
    compound: normalizeCompound(laps[0].tyreCompound),
    session: laps[0].session || 'FP2',
    laps,
    avgLapMs: Math.round(rawTimes.reduce((sum, v) => sum + v, 0) / rawTimes.length),
    variance: stdDev(rawTimes),
    degradationMsPerLap: Math.max(0, slope(rawTimes)),
  };
}

function buildLapDataFromFreePractice(freePractice: FreePractice[]): LapInput[] {
  const laps: LapInput[] = [];
  freePractice
    .filter((fp) => fp.best_lap_time)
    .forEach((fp) => {
      const ms = parseLapTimeToMs(fp.best_lap_time);
      if (!ms) return;
      const syntheticLaps = Math.max(3, Math.min(10, Math.floor(fp.laps / 4) || 3));
      for (let idx = 0; idx < syntheticLaps; idx++) {
        laps.push({
          driverId: fp.driver.id,
          driverName: `${fp.driver.first_name} ${fp.driver.last_name}`,
          driverCode: fp.driver.code,
          teamName: fp.constructor.name,
          teamColor: fp.constructor.team_color,
          lapTimeMs: ms + idx * 35,
          lapNumber: idx + 1,
          tyreCompound: 'UNKNOWN',
          session: fp.session,
          isOutLap: idx === 0,
          isInLap: idx === syntheticLaps - 1,
        });
      }
    });
  return laps;
}

function getQualifyingScores(qualifying: Qualifying[]): Map<number, number> {
  const scores = new Map<number, number>();
  const sorted = [...qualifying].sort((a, b) => a.position - b.position);
  sorted.forEach((q) => scores.set(q.driver.id, normalizePosition(q.position, sorted.length)));
  return scores;
}

function getHistoricalScores(previousResults: Result[][]): Map<number, number> {
  const weighted = new Map<number, { weightedSum: number; weightSum: number }>();
  previousResults.forEach((raceResults, raceIndex) => {
    const weight = Math.pow(HISTORICAL_DECAY, previousResults.length - 1 - raceIndex);
    const totalDrivers = raceResults.length || 20;
    raceResults.forEach((result) => {
      const position = result.final_position || totalDrivers;
      const value = normalizePosition(position, totalDrivers);
      const existing = weighted.get(result.driver.id) || { weightedSum: 0, weightSum: 0 };
      existing.weightedSum += value * weight;
      existing.weightSum += weight;
      weighted.set(result.driver.id, existing);
    });
  });

  const scores = new Map<number, number>();
  weighted.forEach(({ weightedSum, weightSum }, driverId) => {
    scores.set(driverId, weightSum > 0 ? weightedSum / weightSum : 0);
  });
  return scores;
}

function getPracticeScores(freePractice: FreePractice[]): Map<number, number> {
  const driverPositions = new Map<number, number[]>();
  freePractice.forEach((fp) => {
    const existing = driverPositions.get(fp.driver.id) || [];
    existing.push(fp.position);
    driverPositions.set(fp.driver.id, existing);
  });

  const totalDrivers = Math.max(1, driverPositions.size);
  const scores = new Map<number, number>();
  driverPositions.forEach((positions, driverId) => {
    const avgPosition = positions.reduce((sum, p) => sum + p, 0) / positions.length;
    scores.set(driverId, normalizePosition(avgPosition, totalDrivers));
  });
  return scores;
}

// Returns per-driver affinity score based on teammate/PU-mate performance at similar circuits.
// allResults: flat list of all previous results with circuit info attached
function getTeamCircuitAffinityScores(
  previousResults: Result[][],
  races: Array<{ circuitId: string }>,
  targetProfile: CircuitProfile | null
): Map<number, number> {
  const scores = new Map<number, number>();
  if (!targetProfile || !races.length) return scores;

  // Build: driverId -> teamName
  const driverTeam = new Map<number, string>();
  previousResults.flat().forEach((r) => {
    driverTeam.set(r.driver.id, r.constructor.name);
  });

  // For each driver, look at ALL teammates' results at circuits similar to target
  // team circuit affinity = how does this team perform at circuits like this one
  const teamAffinityScores = new Map<string, { sum: number; count: number }>();

  previousResults.forEach((raceResults, raceIndex) => {
    const raceCircuitId = races[raceIndex]?.circuitId;
    if (!raceCircuitId) return;

    const raceProfile = getCircuitProfile(raceCircuitId);
    if (!raceProfile) return;

    const similarity = circuitSimilarity(targetProfile, raceProfile);
    if (similarity < 0.4) return; // only use reasonably similar circuits

    const totalDrivers = raceResults.length || 20;
    raceResults.forEach((result) => {
      const teamName = result.constructor.name;
      const position = result.final_position || totalDrivers;
      const value = normalizePosition(position, totalDrivers) * similarity;

      const existing = teamAffinityScores.get(teamName) || { sum: 0, count: 0 };
      existing.sum += value;
      existing.count += 1;
      teamAffinityScores.set(teamName, existing);
    });
  });

  // Assign team affinity score to each driver
  driverTeam.forEach((teamName, driverId) => {
    const affinity = teamAffinityScores.get(teamName);
    if (affinity && affinity.count > 0) {
      scores.set(driverId, affinity.sum / affinity.count);
    }
  });

  return scores;
}

// PU affinity: how do all teams with the same PU perform at power-sensitive circuits
function getPUAffinityScores(
  previousResults: Result[][],
  races: Array<{ circuitId: string }>,
  targetProfile: CircuitProfile | null
): Map<number, number> {
  const scores = new Map<number, number>();
  if (!targetProfile || !races.length) return scores;

  // Only meaningful on power-sensitive circuits
  if (targetProfile.powerSensitivity === 'low') return scores;

  const puAffinityScores = new Map<string, { sum: number; count: number }>();

  previousResults.forEach((raceResults, raceIndex) => {
    const raceCircuitId = races[raceIndex]?.circuitId;
    if (!raceCircuitId) return;

    const raceProfile = getCircuitProfile(raceCircuitId);
    if (!raceProfile) return;

    // Only use races with similar power sensitivity
    if (raceProfile.powerSensitivity !== targetProfile.powerSensitivity) return;

    const totalDrivers = raceResults.length || 20;
    raceResults.forEach((result) => {
      const pu = getPUSupplier(result.constructor.name);
      if (!pu) return;

      const position = result.final_position || totalDrivers;
      const value = normalizePosition(position, totalDrivers);

      const existing = puAffinityScores.get(pu) || { sum: 0, count: 0 };
      existing.sum += value;
      existing.count += 1;
      puAffinityScores.set(pu, existing);
    });
  });

  // Assign PU affinity to each driver via their team's PU
  const driverTeam = new Map<number, string>();
  previousResults.flat().forEach((r) => driverTeam.set(r.driver.id, r.constructor.name));

  driverTeam.forEach((teamName, driverId) => {
    const pu = getPUSupplier(teamName);
    if (!pu) return;
    const affinity = puAffinityScores.get(pu);
    if (affinity && affinity.count > 0) {
      scores.set(driverId, affinity.sum / affinity.count);
    }
  });

  return scores;
}

function buildRaceProfiles(
  stints: Stint[],
  qualifiers: Qualifying[],
  practiceScores: Map<number, number>,
  historicalScores: Map<number, number>
): Map<number, DriverRaceProfile> {
  const byDriver = new Map<number, Stint[]>();
  stints.forEach((stint) => {
    const existing = byDriver.get(stint.driverId) || [];
    existing.push(stint);
    byDriver.set(stint.driverId, existing);
  });

  const profiles = new Map<number, DriverRaceProfile>();
  byDriver.forEach((driverStints, driverId) => {
    const weightedLapValues = driverStints.map((stint) => {
      const tyreWeight = TYRE_WEIGHTS[stint.compound] || TYRE_WEIGHTS.UNKNOWN;
      const stintLengthWeight = Math.min(1.25, 0.55 + stint.laps.length / 8);
      const degradationPenalty = Math.min(1.12, 1 + stint.degradationMsPerLap / 500);
      return {
        pace: stint.avgLapMs * degradationPenalty,
        weight: tyreWeight * stintLengthWeight,
        length: stint.laps.length,
        variance: stint.variance,
      };
    });

    const longStints = weightedLapValues.filter((s) => s.length >= 8);
    const bestLongStintMs = (longStints.length ? longStints : weightedLapValues)
      .reduce((best, curr) => Math.min(best, curr.pace), Number.MAX_SAFE_INTEGER);

    const mostConsistent = weightedLapValues.reduce(
      (best, curr) => (curr.variance < best.variance ? curr : best),
      weightedLapValues[0]
    );

    const weightedSum = weightedLapValues.reduce((sum, s) => sum + s.pace * s.weight, 0);
    const totalWeight = weightedLapValues.reduce((sum, s) => sum + s.weight, 0) || 1;
    const overallAvgMs = weightedSum / totalWeight;
    const consistencyScore = Math.max(0, 1 - mostConsistent.variance / 1200);
    const racePaceMs = bestLongStintMs * 0.45 + mostConsistent.pace * 0.35 + overallAvgMs * 0.2;

    const qualyPosition = qualifiers.find((q) => q.driver.id === driverId)?.position;
    const qualyScore = qualyPosition ? normalizePosition(qualyPosition, qualifiers.length || 20) : 0;
    const paceNormalized = Math.max(0, Math.min(1, 1 - (racePaceMs - 80000) / 25000));

    // Preliminary score used only for profile building (weights applied in main loop)
    const score = paceNormalized * 0.65 + qualyScore * 0.25 + consistencyScore * 0.1;

    const stintCount = driverStints.length;
    const confidence: 'low' | 'medium' | 'high' =
      stintCount >= 2 && longStints.length >= 1 ? 'high' : stintCount >= 1 ? 'medium' : 'low';

    profiles.set(driverId, {
      driverId,
      racePaceMs,
      consistencyScore,
      bestLongStintMs,
      mostConsistentStintMs: mostConsistent.pace,
      overallAvgMs,
      score,
      confidence,
    });
  });

  return profiles;
}

function estimateTotalTimeMs(racePaceMs: number, totalLaps: number, degradationMsPerLap: number, pitStops: number): number {
  return Math.round(racePaceMs * totalLaps + pitStops * 22000 + degradationMsPerLap * totalLaps * 0.35);
}

function buildCacheKey(input: PredictionInput): string {
  return JSON.stringify({
    lapCount: input.lapData?.length || 0,
    raceCount: input.previousResults.length,
    qualyCount: input.qualifying.length,
    fpCount: input.freePractice.length,
    totalLaps: input.totalLaps || 58,
    circuitId: input.circuitId || '',
    filters: input.filters || {},
  });
}

export function predictRace(
  input: PredictionInput,
  previousRaceCircuitIds: string[] = []
): PredictionResult {
  const cacheKey = buildCacheKey(input);
  const cached = predictionCache.get(cacheKey);
  if (cached) return cached;

  const dataSources: string[] = [];
  if (input.qualifying.length) dataSources.push('Qualifying');
  if (input.freePractice.length) dataSources.push('Free Practice');
  if (input.previousResults.some((r) => r.length > 0)) dataSources.push('Historical Results');
  if ((input.lapData?.length || 0) > 0) dataSources.push('Lap-by-Lap');

  // Circuit profile & weights
  const circuitProfile = input.circuitId ? getCircuitProfile(input.circuitId) : null;
  const weights = getCircuitWeights(circuitProfile);

  if (circuitProfile) dataSources.push(`Circuit: ${circuitProfile.name}`);

  // Lap processing
  const candidateLapData = (input.lapData && input.lapData.length)
    ? input.lapData
    : buildLapDataFromFreePractice(input.freePractice);

  const filtered = filterLapData(candidateLapData, input.filters);
  const cleaned = cleanValidLaps(filtered, Boolean(input.filters?.includeOutliers));
  const stints = detectStints(cleaned, input.filters?.minStintLength || DEFAULT_FILTERS.minStintLength);

  // Base scores
  const qualyScores = getQualifyingScores(input.qualifying);
  const practiceScores = getPracticeScores(input.freePractice);
  const historicalScores = getHistoricalScores(input.previousResults);

  // Circuit affinity scores (uses previous race circuit IDs for similarity lookup)
  const racesForAffinity = previousRaceCircuitIds.map((cid) => ({ circuitId: cid }));
  const teamAffinityScores = getTeamCircuitAffinityScores(
    input.previousResults, racesForAffinity, circuitProfile
  );
  const puAffinityScores = getPUAffinityScores(
    input.previousResults, racesForAffinity, circuitProfile
  );

  if (teamAffinityScores.size > 0) dataSources.push('Team Circuit Affinity');
  if (puAffinityScores.size > 0) dataSources.push('PU Affinity');

  const profiles = buildRaceProfiles(stints, input.qualifying, practiceScores, historicalScores);

  // Collect all known drivers
  const allDrivers = new Map<number, { name: string; code: string; teamName: string; teamColor: string | null }>();

  input.qualifying.forEach((q) => {
    allDrivers.set(q.driver.id, {
      name: `${q.driver.first_name} ${q.driver.last_name}`,
      code: q.driver.code,
      teamName: q.constructor.name,
      teamColor: q.constructor.team_color,
    });
  });
  input.freePractice.forEach((fp) => {
    if (!allDrivers.has(fp.driver.id)) {
      allDrivers.set(fp.driver.id, {
        name: `${fp.driver.first_name} ${fp.driver.last_name}`,
        code: fp.driver.code,
        teamName: fp.constructor.name,
        teamColor: fp.constructor.team_color,
      });
    }
  });
  input.previousResults.flat().forEach((r) => {
    if (!allDrivers.has(r.driver.id)) {
      allDrivers.set(r.driver.id, {
        name: `${r.driver.first_name} ${r.driver.last_name}`,
        code: r.driver.code,
        teamName: r.constructor.name,
        teamColor: r.constructor.team_color,
      });
    }
  });

  const predictions: DriverPrediction[] = [];
  const totalLaps = input.totalLaps || 58;

  allDrivers.forEach((driverInfo, driverId) => {
    const profile = profiles.get(driverId);
    const racePaceMs = profile?.racePaceMs || 90000 - (historicalScores.get(driverId) || 0) * 4000;
    const consistencyScore = profile?.consistencyScore || 0.45;

    // Normalized sub-scores (0-1)
    const paceNorm = Math.max(0, Math.min(1, 1 - (racePaceMs - 80000) / 25000));
    const qualyNorm = qualyScores.get(driverId) || 0;
    const histNorm = historicalScores.get(driverId) || 0;
    const practiceNorm = practiceScores.get(driverId) || 0;
    const teamAffinityNorm = teamAffinityScores.get(driverId) || histNorm * 0.6; // fallback to partial historical
    const puAffinityNorm = puAffinityScores.get(driverId) || histNorm * 0.4;

    // Weighted final score using circuit-specific weights
    const score =
      paceNorm           * weights.racePace +
      qualyNorm          * weights.qualifying +
      consistencyScore   * weights.consistency +
      histNorm           * weights.historical +
      teamAffinityNorm   * weights.teamCircuitAffinity +
      puAffinityNorm     * weights.puAffinity +
      practiceNorm       * 0.04; // small constant contribution

    const driverStints = stints.filter((s) => s.driverId === driverId);
    const avgDegradation = driverStints.length
      ? driverStints.reduce((sum, stint) => sum + stint.degradationMsPerLap, 0) / driverStints.length
      : 0;

    const pitStops = driverStints.length >= 3 ? 2 : 1;
    const predictedTotalTimeMs = estimateTotalTimeMs(racePaceMs, totalLaps, avgDegradation, pitStops);

    const qualyEntry = input.qualifying.find((q) => q.driver.id === driverId);
    const practiceEntries = input.freePractice.filter((fp) => fp.driver.id === driverId);
    const avgPracticePosition = practiceEntries.length
      ? practiceEntries.reduce((sum, fp) => sum + fp.position, 0) / practiceEntries.length
      : null;

    const histPositions: number[] = [];
    input.previousResults.forEach((rr) => {
      const result = rr.find((r) => r.driver.id === driverId);
      if (result?.final_position) histPositions.push(result.final_position);
    });
    const historicalAvgPosition = histPositions.length
      ? histPositions.reduce((sum, p) => sum + p, 0) / histPositions.length
      : null;

    predictions.push({
      driverId,
      driverName: driverInfo.name,
      driverCode: driverInfo.code,
      teamName: driverInfo.teamName,
      teamColor: driverInfo.teamColor,
      predictedPosition: 0,
      score,
      confidence: profile?.confidence || (histPositions.length >= 3 ? 'medium' : 'low'),
      qualyPosition: qualyEntry?.position ?? null,
      avgPracticePosition: avgPracticePosition ? Math.round(avgPracticePosition * 10) / 10 : null,
      historicalAvgPosition: historicalAvgPosition ? Math.round(historicalAvgPosition * 10) / 10 : null,
      predictedTotalTimeMs,
      gapToLeaderMs: 0,
      racePaceMs,
      consistencyScore,
      scoreBreakdown: {
        racePace: Math.round(paceNorm * weights.racePace * 1000) / 1000,
        qualifying: Math.round(qualyNorm * weights.qualifying * 1000) / 1000,
        consistency: Math.round(consistencyScore * weights.consistency * 1000) / 1000,
        historical: Math.round(histNorm * weights.historical * 1000) / 1000,
        teamCircuitAffinity: Math.round(teamAffinityNorm * weights.teamCircuitAffinity * 1000) / 1000,
        puAffinity: Math.round(puAffinityNorm * weights.puAffinity * 1000) / 1000,
      },
    });
  });

  predictions.sort((a, b) => b.score - a.score || a.predictedTotalTimeMs - b.predictedTotalTimeMs);

  const leaderTime = predictions[0]?.predictedTotalTimeMs || 0;
  predictions.forEach((pred, index) => {
    pred.predictedPosition = index + 1;
    pred.gapToLeaderMs = Math.max(0, pred.predictedTotalTimeMs - leaderTime);
  });

  // Safety car likelihood degrades confidence — SC/VSC can completely randomise results
  const scLikelihood = circuitProfile?.safetyCarLikelihood ?? 'medium';
  const baseConfidence: 'low' | 'medium' | 'high' =
    dataSources.includes('Lap-by-Lap') && stints.length > 15 ? 'high' :
    dataSources.length >= 2 ? 'medium' : 'low';

  const overallConfidence: 'low' | 'medium' | 'high' =
    scLikelihood === 'high' && baseConfidence === 'high' ? 'medium' :
    scLikelihood === 'high' && baseConfidence === 'medium' ? 'low' :
    baseConfidence;

  const result: PredictionResult = {
    predictions,
    dataSourcesUsed: dataSources,
    overallConfidence,
    circuitProfile,
  };

  predictionCache.set(cacheKey, result);
  return result;
}

export function compareWithActual(
  predictions: DriverPrediction[],
  actualResults: Result[]
): { driverId: number; predicted: number; actual: number; difference: number }[] {
  const sorted = [...actualResults].sort((a, b) => {
    if (a.final_position && b.final_position) return a.final_position - b.final_position;
    if (a.final_position) return -1;
    if (b.final_position) return 1;
    return 0;
  });

  return predictions.map((pred) => {
    const actualResult = sorted.find((r) => r.driver.id === pred.driverId);
    const actualPos = actualResult?.final_position ?? sorted.length;
    return {
      driverId: pred.driverId,
      predicted: pred.predictedPosition,
      actual: actualPos,
      difference: pred.predictedPosition - actualPos,
    };
  });
}
