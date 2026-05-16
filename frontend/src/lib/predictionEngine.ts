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
  circuitId?: string;
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

// Raw criteria per driver before MOORA normalization
interface DriverRawCriteria {
  driverId: number;
  qualyScore: number;         // beneficial  0-1
  racePaceMs: number;         // non-beneficial (lower ms = faster = better)
  consistencyScore: number;   // beneficial  0-1
  historicalScore: number;    // beneficial  0-1
  teamAffinityScore: number;  // beneficial  0-1
  puAffinityScore: number;    // beneficial  0-1
  practiceScore: number;      // beneficial  0-1
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

// ─── MOORA ───────────────────────────────────────────────────────────────────

/**
 * MOORA Ratio System normalisation.
 * x*[i] = x[i] / sqrt(Σ x[k]²)
 * Makes values dimensionless and scale-invariant so ms can be mixed with 0-1 scores.
 */
function mooraNormalize(values: number[]): number[] {
  const sumSq = values.reduce((s, v) => s + v * v, 0);
  const divisor = Math.sqrt(sumSq) || 1;
  return values.map((v) => v / divisor);
}

/**
 * Apply MOORA Ratio System to the driver criteria matrix.
 *
 * Yi = Σ(w·x* for beneficial criteria) − Σ(w·x* for non-beneficial criteria)
 *
 * Beneficial  → higher raw value is better  (qualy score, consistency, etc.)
 * Non-beneficial → lower raw value is better (race pace in ms)
 */
function applyMOORA(
  criteria: DriverRawCriteria[],
  weights: { qualifying: number; racePace: number; consistency: number; historical: number; teamCircuitAffinity: number; puAffinity: number }
): Map<number, { score: number; breakdown: DriverPrediction['scoreBreakdown'] }> {
  if (!criteria.length) return new Map();

  // Normalise each column independently
  const qualyN    = mooraNormalize(criteria.map((d) => d.qualyScore));
  const paceN     = mooraNormalize(criteria.map((d) => d.racePaceMs));
  const consiN    = mooraNormalize(criteria.map((d) => d.consistencyScore));
  const histN     = mooraNormalize(criteria.map((d) => d.historicalScore));
  const teamN     = mooraNormalize(criteria.map((d) => d.teamAffinityScore));
  const puN       = mooraNormalize(criteria.map((d) => d.puAffinityScore));
  const practiceN = mooraNormalize(criteria.map((d) => d.practiceScore));

  const result = new Map<number, { score: number; breakdown: DriverPrediction['scoreBreakdown'] }>();

  criteria.forEach((d, i) => {
    const beneficial =
      qualyN[i]    * weights.qualifying +
      consiN[i]    * weights.consistency +
      histN[i]     * weights.historical +
      teamN[i]     * weights.teamCircuitAffinity +
      puN[i]       * weights.puAffinity +
      practiceN[i] * 0.04;

    // Non-beneficial: subtracted — better pace (lower ms) lowers this penalty
    const nonBeneficial = paceN[i] * weights.racePace;

    const score = beneficial - nonBeneficial;

    result.set(d.driverId, {
      score,
      breakdown: {
        racePace:           Math.round(nonBeneficial * 1000) / 1000,
        qualifying:         Math.round(qualyN[i] * weights.qualifying * 1000) / 1000,
        consistency:        Math.round(consiN[i] * weights.consistency * 1000) / 1000,
        historical:         Math.round(histN[i] * weights.historical * 1000) / 1000,
        teamCircuitAffinity:Math.round(teamN[i] * weights.teamCircuitAffinity * 1000) / 1000,
        puAffinity:         Math.round(puN[i] * weights.puAffinity * 1000) / 1000,
      },
    });
  });

  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    if (merged.tyreCompound !== 'UNKNOWN' && normalizeCompound(lap.tyreCompound) !== merged.tyreCompound) return false;
    if (lap.lapNumber < merged.minLap || lap.lapNumber > merged.maxLap) return false;
    return true;
  });
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length);
}

function slope(values: number[]): number {
  if (values.length < 2) return 0;
  let xS = 0, yS = 0, xyS = 0, xxS = 0;
  for (let i = 0; i < values.length; i++) {
    const x = i + 1, y = values[i];
    xS += x; yS += y; xyS += x * y; xxS += x * x;
  }
  const n = values.length;
  const denom = n * xxS - xS * xS;
  return denom === 0 ? 0 : (n * xyS - xS * yS) / denom;
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
    const cap = Math.round(median(driverLaps.map((l) => l.lapTimeMs)) * 1.08);
    let kept = driverLaps.filter((l) => l.lapTimeMs <= cap);
    if (!includeOutliers && kept.length > 4) {
      const med = median(kept.map((l) => l.lapTimeMs));
      const mad = median(kept.map((l) => Math.abs(l.lapTimeMs - med))) || 1;
      kept = kept.filter((l) => (0.6745 * Math.abs(l.lapTimeMs - med)) / mad <= 3.5);
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
      const ok = !prev || (
        normalizeCompound(prev.tyreCompound) === normalizeCompound(lap.tyreCompound) &&
        (prev.session || 'FP2') === (lap.session || 'FP2') &&
        lap.lapNumber === prev.lapNumber + 1
      );
      if (ok) { current.push(lap); }
      else {
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
    const fuel = lap.lapTimeMs - Math.max(0, (90 - lap.lapNumber)) * FUEL_CORRECTION_PER_LAP_MS;
    const sf = lap.session === 'FP1' ? 1.006 : lap.session === 'FP3' ? 0.997 : 1;
    return Math.round(fuel * sf);
  });
  return {
    driverId,
    compound: normalizeCompound(laps[0].tyreCompound),
    session: laps[0].session || 'FP2',
    laps,
    avgLapMs: Math.round(rawTimes.reduce((s, v) => s + v, 0) / rawTimes.length),
    variance: stdDev(rawTimes),
    degradationMsPerLap: Math.max(0, slope(rawTimes)),
  };
}

function buildLapDataFromFreePractice(freePractice: FreePractice[]): LapInput[] {
  const laps: LapInput[] = [];
  freePractice.filter((fp) => fp.best_lap_time).forEach((fp) => {
    const ms = parseLapTimeToMs(fp.best_lap_time);
    if (!ms) return;
    const n = Math.max(3, Math.min(10, Math.floor(fp.laps / 4) || 3));
    for (let i = 0; i < n; i++) {
      laps.push({
        driverId: fp.driver.id,
        driverName: `${fp.driver.first_name} ${fp.driver.last_name}`,
        driverCode: fp.driver.code,
        teamName: fp.constructor.name,
        teamColor: fp.constructor.team_color,
        lapTimeMs: ms + i * 35,
        lapNumber: i + 1,
        tyreCompound: 'UNKNOWN',
        session: fp.session,
        isOutLap: i === 0,
        isInLap: i === n - 1,
      });
    }
  });
  return laps;
}

// ─── Score builders ───────────────────────────────────────────────────────────

function getQualifyingScores(qualifying: Qualifying[]): Map<number, number> {
  const scores = new Map<number, number>();
  const sorted = [...qualifying].sort((a, b) => a.position - b.position);
  sorted.forEach((q) => scores.set(q.driver.id, normalizePosition(q.position, sorted.length)));
  return scores;
}

function getHistoricalScores(previousResults: Result[][]): Map<number, number> {
  const weighted = new Map<number, { ws: number; wt: number }>();
  previousResults.forEach((raceResults, raceIndex) => {
    const weight = Math.pow(HISTORICAL_DECAY, previousResults.length - 1 - raceIndex);
    const total = raceResults.length || 20;
    raceResults.forEach((r) => {
      const v = normalizePosition(r.final_position || total, total);
      const e = weighted.get(r.driver.id) || { ws: 0, wt: 0 };
      e.ws += v * weight; e.wt += weight;
      weighted.set(r.driver.id, e);
    });
  });
  const scores = new Map<number, number>();
  weighted.forEach(({ ws, wt }, id) => scores.set(id, wt > 0 ? ws / wt : 0));
  return scores;
}

function getPracticeScores(freePractice: FreePractice[]): Map<number, number> {
  const pos = new Map<number, number[]>();
  freePractice.forEach((fp) => {
    const e = pos.get(fp.driver.id) || [];
    e.push(fp.position);
    pos.set(fp.driver.id, e);
  });
  const total = Math.max(1, pos.size);
  const scores = new Map<number, number>();
  pos.forEach((positions, id) => {
    scores.set(id, normalizePosition(positions.reduce((s, p) => s + p, 0) / positions.length, total));
  });
  return scores;
}

function getRacePacePerDriver(stints: Stint[]): Map<number, { racePaceMs: number; consistencyScore: number; confidence: 'low' | 'medium' | 'high'; degradationMsPerLap: number }> {
  const byDriver = new Map<number, Stint[]>();
  stints.forEach((s) => {
    const e = byDriver.get(s.driverId) || [];
    e.push(s);
    byDriver.set(s.driverId, e);
  });

  const result = new Map<number, { racePaceMs: number; consistencyScore: number; confidence: 'low' | 'medium' | 'high'; degradationMsPerLap: number }>();

  byDriver.forEach((driverStints, driverId) => {
    const weighted = driverStints.map((s) => {
      const tw = TYRE_WEIGHTS[s.compound] || TYRE_WEIGHTS.UNKNOWN;
      const lw = Math.min(1.25, 0.55 + s.laps.length / 8);
      const dp = Math.min(1.12, 1 + s.degradationMsPerLap / 500);
      return { pace: s.avgLapMs * dp, weight: tw * lw, length: s.laps.length, variance: s.variance };
    });

    const longStints = weighted.filter((s) => s.length >= 8);
    const bestLong = (longStints.length ? longStints : weighted)
      .reduce((b, c) => Math.min(b, c.pace), Number.MAX_SAFE_INTEGER);
    const mostConsistent = weighted.reduce((b, c) => (c.variance < b.variance ? c : b), weighted[0]);
    const ws = weighted.reduce((s, x) => s + x.pace * x.weight, 0);
    const wt = weighted.reduce((s, x) => s + x.weight, 0) || 1;

    const racePaceMs = bestLong * 0.45 + mostConsistent.pace * 0.35 + (ws / wt) * 0.2;
    const consistencyScore = Math.max(0, 1 - mostConsistent.variance / 1200);
    const avgDeg = driverStints.reduce((s, x) => s + x.degradationMsPerLap, 0) / driverStints.length;
    const confidence: 'low' | 'medium' | 'high' =
      driverStints.length >= 2 && longStints.length >= 1 ? 'high' :
      driverStints.length >= 1 ? 'medium' : 'low';

    result.set(driverId, { racePaceMs, consistencyScore, confidence, degradationMsPerLap: avgDeg });
  });

  return result;
}

function getTeamCircuitAffinityScores(
  previousResults: Result[][],
  races: { circuitId: string }[],
  targetProfile: CircuitProfile | null
): Map<number, number> {
  const scores = new Map<number, number>();
  if (!targetProfile || !races.length) return scores;

  const teamAcc = new Map<string, { sum: number; count: number }>();
  previousResults.forEach((raceResults, i) => {
    const raceProfile = getCircuitProfile(races[i]?.circuitId || '');
    if (!raceProfile) return;
    const sim = circuitSimilarity(targetProfile, raceProfile);
    if (sim < 0.4) return;
    const total = raceResults.length || 20;
    raceResults.forEach((r) => {
      const v = normalizePosition(r.final_position || total, total) * sim;
      const e = teamAcc.get(r.constructor.name) || { sum: 0, count: 0 };
      e.sum += v; e.count += 1;
      teamAcc.set(r.constructor.name, e);
    });
  });

  const driverTeam = new Map<number, string>();
  previousResults.flat().forEach((r) => driverTeam.set(r.driver.id, r.constructor.name));
  driverTeam.forEach((team, id) => {
    const e = teamAcc.get(team);
    if (e && e.count > 0) scores.set(id, e.sum / e.count);
  });
  return scores;
}

function getPUAffinityScores(
  previousResults: Result[][],
  races: { circuitId: string }[],
  targetProfile: CircuitProfile | null
): Map<number, number> {
  const scores = new Map<number, number>();
  if (!targetProfile || !races.length || targetProfile.powerSensitivity === 'low') return scores;

  const puAcc = new Map<string, { sum: number; count: number }>();
  previousResults.forEach((raceResults, i) => {
    const raceProfile = getCircuitProfile(races[i]?.circuitId || '');
    if (!raceProfile || raceProfile.powerSensitivity !== targetProfile.powerSensitivity) return;
    const total = raceResults.length || 20;
    raceResults.forEach((r) => {
      const pu = getPUSupplier(r.constructor.name);
      if (!pu) return;
      const v = normalizePosition(r.final_position || total, total);
      const e = puAcc.get(pu) || { sum: 0, count: 0 };
      e.sum += v; e.count += 1;
      puAcc.set(pu, e);
    });
  });

  const driverTeam = new Map<number, string>();
  previousResults.flat().forEach((r) => driverTeam.set(r.driver.id, r.constructor.name));
  driverTeam.forEach((team, id) => {
    const pu = getPUSupplier(team);
    if (!pu) return;
    const e = puAcc.get(pu);
    if (e && e.count > 0) scores.set(id, e.sum / e.count);
  });
  return scores;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

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

  const circuitProfile = input.circuitId ? getCircuitProfile(input.circuitId) : null;
  const weights = getCircuitWeights(circuitProfile);
  if (circuitProfile) dataSources.push(`Circuit: ${circuitProfile.name}`);

  // Lap processing
  const candidateLaps = (input.lapData?.length) ? input.lapData : buildLapDataFromFreePractice(input.freePractice);
  const filtered  = filterLapData(candidateLaps, input.filters);
  const cleaned   = cleanValidLaps(filtered, Boolean(input.filters?.includeOutliers));
  const stints    = detectStints(cleaned, input.filters?.minStintLength ?? DEFAULT_FILTERS.minStintLength);

  // Sub-scores
  const qualyScores    = getQualifyingScores(input.qualifying);
  const practiceScores = getPracticeScores(input.freePractice);
  const historicalScores = getHistoricalScores(input.previousResults);
  const paceProfiles   = getRacePacePerDriver(stints);

  const racesForAffinity = previousRaceCircuitIds.map((cid) => ({ circuitId: cid }));
  const teamAffinityScores = getTeamCircuitAffinityScores(input.previousResults, racesForAffinity, circuitProfile);
  const puAffinityScores   = getPUAffinityScores(input.previousResults, racesForAffinity, circuitProfile);

  if (teamAffinityScores.size > 0) dataSources.push('Team Circuit Affinity');
  if (puAffinityScores.size > 0)   dataSources.push('PU Affinity');

  // Collect all known drivers
  const allDrivers = new Map<number, { name: string; code: string; teamName: string; teamColor: string | null }>();
  const addDriver = (id: number, fn: string, ln: string, code: string, team: string, color: string | null) => {
    if (!allDrivers.has(id)) allDrivers.set(id, { name: `${fn} ${ln}`, code, teamName: team, teamColor: color });
  };
  input.qualifying.forEach((q) => addDriver(q.driver.id, q.driver.first_name, q.driver.last_name, q.driver.code, q.constructor.name, q.constructor.team_color));
  input.freePractice.forEach((fp) => addDriver(fp.driver.id, fp.driver.first_name, fp.driver.last_name, fp.driver.code, fp.constructor.name, fp.constructor.team_color));
  input.previousResults.flat().forEach((r) => addDriver(r.driver.id, r.driver.first_name, r.driver.last_name, r.driver.code, r.constructor.name, r.constructor.team_color));

  // Default pace when no stint data exists — estimated from historical score
  const globalMedianPaceMs = (() => {
    const paces = [...paceProfiles.values()].map((p) => p.racePaceMs);
    return paces.length ? median(paces) : 90000;
  })();

  // Build raw criteria matrix for MOORA
  const criteriaMatrix: DriverRawCriteria[] = [];
  const totalLaps = input.totalLaps || 58;

  allDrivers.forEach((_, driverId) => {
    const hist = historicalScores.get(driverId) || 0;
    const pace = paceProfiles.get(driverId);

    criteriaMatrix.push({
      driverId,
      qualyScore:          qualyScores.get(driverId) || 0,
      racePaceMs:          pace?.racePaceMs ?? (globalMedianPaceMs + (1 - hist) * 3000),
      consistencyScore:    pace?.consistencyScore ?? 0.45,
      historicalScore:     hist,
      teamAffinityScore:   teamAffinityScores.get(driverId) ?? hist * 0.6,
      puAffinityScore:     puAffinityScores.get(driverId) ?? hist * 0.4,
      practiceScore:       practiceScores.get(driverId) || 0,
    });
  });

  // Apply MOORA
  const mooraResults = applyMOORA(criteriaMatrix, weights);

  // Build final predictions
  const predictions: DriverPrediction[] = [];

  allDrivers.forEach((driverInfo, driverId) => {
    const moora  = mooraResults.get(driverId);
    const pace   = paceProfiles.get(driverId);
    const raw    = criteriaMatrix.find((c) => c.driverId === driverId)!;

    const racePaceMs      = raw.racePaceMs;
    const consistencyScore = raw.consistencyScore;
    const avgDeg          = pace?.degradationMsPerLap ?? 0;
    const pitStops        = stints.filter((s) => s.driverId === driverId).length >= 3 ? 2 : 1;
    const predictedTotalTimeMs = Math.round(racePaceMs * totalLaps + pitStops * 22000 + avgDeg * totalLaps * 0.35);

    const qualyEntry      = input.qualifying.find((q) => q.driver.id === driverId);
    const practiceEntries = input.freePractice.filter((fp) => fp.driver.id === driverId);
    const avgPracticePos  = practiceEntries.length
      ? practiceEntries.reduce((s, fp) => s + fp.position, 0) / practiceEntries.length
      : null;

    const histPositions: number[] = [];
    input.previousResults.forEach((rr) => {
      const r = rr.find((x) => x.driver.id === driverId);
      if (r?.final_position) histPositions.push(r.final_position);
    });
    const historicalAvgPos = histPositions.length
      ? histPositions.reduce((s, p) => s + p, 0) / histPositions.length
      : null;

    const confidence: 'low' | 'medium' | 'high' =
      pace?.confidence ?? (histPositions.length >= 3 ? 'medium' : 'low');

    predictions.push({
      driverId,
      driverName:          driverInfo.name,
      driverCode:          driverInfo.code,
      teamName:            driverInfo.teamName,
      teamColor:           driverInfo.teamColor,
      predictedPosition:   0,
      score:               moora?.score ?? 0,
      confidence,
      qualyPosition:       qualyEntry?.position ?? null,
      avgPracticePosition: avgPracticePos ? Math.round(avgPracticePos * 10) / 10 : null,
      historicalAvgPosition: historicalAvgPos ? Math.round(historicalAvgPos * 10) / 10 : null,
      predictedTotalTimeMs,
      gapToLeaderMs:       0,
      racePaceMs,
      consistencyScore,
      scoreBreakdown:      moora?.breakdown,
    });
  });

  // Sort by MOORA score descending
  predictions.sort((a, b) => b.score - a.score || a.predictedTotalTimeMs - b.predictedTotalTimeMs);

  const leaderTime = predictions[0]?.predictedTotalTimeMs || 0;
  predictions.forEach((p, i) => {
    p.predictedPosition = i + 1;
    p.gapToLeaderMs = Math.max(0, p.predictedTotalTimeMs - leaderTime);
  });

  // Downgrade confidence on high SC-risk circuits
  const scLikelihood = circuitProfile?.safetyCarLikelihood ?? 'medium';
  const baseConf: 'low' | 'medium' | 'high' =
    dataSources.includes('Lap-by-Lap') && stints.length > 15 ? 'high' :
    dataSources.length >= 2 ? 'medium' : 'low';
  const overallConfidence: 'low' | 'medium' | 'high' =
    scLikelihood === 'high' && baseConf === 'high' ? 'medium' :
    scLikelihood === 'high' && baseConf === 'medium' ? 'low' :
    baseConf;

  const result: PredictionResult = { predictions, dataSourcesUsed: dataSources, overallConfidence, circuitProfile };
  predictionCache.set(cacheKey, result);
  return result;
}

export function compareWithActual(
  predictions: DriverPrediction[],
  actualResults: Result[]
): { driverId: number; predicted: number; actual: number; difference: number }[] {
  const sorted = [...actualResults].sort((a, b) => {
    if (a.final_position && b.final_position) return a.final_position - b.final_position;
    return a.final_position ? -1 : 1;
  });
  return predictions.map((pred) => {
    const actual = sorted.find((r) => r.driver.id === pred.driverId)?.final_position ?? sorted.length;
    return { driverId: pred.driverId, predicted: pred.predictedPosition, actual, difference: pred.predictedPosition - actual };
  });
}
