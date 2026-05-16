export type AeroLoad = 'low' | 'medium' | 'high';
export type TireWear = 'low' | 'medium' | 'high';
export type OvertakingDifficulty = 'easy' | 'medium' | 'hard';
export type PowerSensitivity = 'low' | 'medium' | 'high';
export type SafetyCarLikelihood = 'low' | 'medium' | 'high';

export interface CircuitProfile {
  circuitId: string;
  name: string;
  aeroLoad: AeroLoad;
  tireWear: TireWear;
  overtakingDifficulty: OvertakingDifficulty;
  powerSensitivity: PowerSensitivity;
  streetCircuit: boolean;
  safetyCarLikelihood: SafetyCarLikelihood; // high SC probability = lower prediction confidence
}

// Keyed by circuit_id as returned by the backend (Ergast convention)
export const CIRCUIT_PROFILES: Record<string, CircuitProfile> = {
  bahrain: {
    circuitId: 'bahrain',
    name: 'Bahrain',
    aeroLoad: 'medium',
    tireWear: 'high',
    overtakingDifficulty: 'easy',
    powerSensitivity: 'medium',
    streetCircuit: false,
    safetyCarLikelihood: 'low',
  },
  jeddah: {
    circuitId: 'jeddah',
    name: 'Saudi Arabia',
    aeroLoad: 'low',
    tireWear: 'low',
    overtakingDifficulty: 'easy',
    powerSensitivity: 'high',
    streetCircuit: true,
    safetyCarLikelihood: 'high', // barriers close, high speed, frequent incidents
  },
  albert_park: {
    circuitId: 'albert_park',
    name: 'Australia',
    aeroLoad: 'medium',
    tireWear: 'medium',
    overtakingDifficulty: 'medium',
    powerSensitivity: 'medium',
    streetCircuit: false,
    safetyCarLikelihood: 'medium',
  },
  suzuka: {
    circuitId: 'suzuka',
    name: 'Japan',
    aeroLoad: 'high',
    tireWear: 'medium',
    overtakingDifficulty: 'medium',
    powerSensitivity: 'low',
    streetCircuit: false,
    safetyCarLikelihood: 'low',
  },
  shanghai: {
    circuitId: 'shanghai',
    name: 'China',
    aeroLoad: 'medium',
    tireWear: 'medium',
    overtakingDifficulty: 'easy',
    powerSensitivity: 'medium',
    streetCircuit: false,
    safetyCarLikelihood: 'low',
  },
  miami: {
    circuitId: 'miami',
    name: 'Miami',
    aeroLoad: 'medium',
    tireWear: 'medium',
    overtakingDifficulty: 'easy',
    powerSensitivity: 'medium',
    streetCircuit: true,
    safetyCarLikelihood: 'medium',
  },
  imola: {
    circuitId: 'imola',
    name: 'Imola',
    aeroLoad: 'medium',
    tireWear: 'medium',
    overtakingDifficulty: 'medium',
    powerSensitivity: 'medium',
    streetCircuit: false,
    safetyCarLikelihood: 'medium',
  },
  monaco: {
    circuitId: 'monaco',
    name: 'Monaco',
    aeroLoad: 'high',
    tireWear: 'low',
    overtakingDifficulty: 'hard',
    powerSensitivity: 'low',
    streetCircuit: true,
    safetyCarLikelihood: 'high', // historically most SC-prone circuit
  },
  catalunya: {
    circuitId: 'catalunya',
    name: 'Spain',
    aeroLoad: 'medium',
    tireWear: 'high',
    overtakingDifficulty: 'medium',
    powerSensitivity: 'medium',
    streetCircuit: false,
    safetyCarLikelihood: 'low',
  },
  villeneuve: {
    circuitId: 'villeneuve',
    name: 'Canada',
    aeroLoad: 'low',
    tireWear: 'low',
    overtakingDifficulty: 'easy',
    powerSensitivity: 'high',
    streetCircuit: false,
    safetyCarLikelihood: 'high', // walls close, chicanes, historically many SCs
  },
  red_bull_ring: {
    circuitId: 'red_bull_ring',
    name: 'Austria',
    aeroLoad: 'medium',
    tireWear: 'medium',
    overtakingDifficulty: 'medium',
    powerSensitivity: 'medium',
    streetCircuit: false,
    safetyCarLikelihood: 'medium',
  },
  silverstone: {
    circuitId: 'silverstone',
    name: 'Britain',
    aeroLoad: 'medium',
    tireWear: 'high',
    overtakingDifficulty: 'medium',
    powerSensitivity: 'medium',
    streetCircuit: false,
    safetyCarLikelihood: 'low',
  },
  spa: {
    circuitId: 'spa',
    name: 'Belgium',
    aeroLoad: 'low',
    tireWear: 'medium',
    overtakingDifficulty: 'easy',
    powerSensitivity: 'high',
    streetCircuit: false,
    safetyCarLikelihood: 'medium', // Raidillon incidents, variable weather
  },
  hungaroring: {
    circuitId: 'hungaroring',
    name: 'Hungary',
    aeroLoad: 'high',
    tireWear: 'medium',
    overtakingDifficulty: 'hard',
    powerSensitivity: 'low',
    streetCircuit: false,
    safetyCarLikelihood: 'low',
  },
  zandvoort: {
    circuitId: 'zandvoort',
    name: 'Netherlands',
    aeroLoad: 'high',
    tireWear: 'medium',
    overtakingDifficulty: 'hard',
    powerSensitivity: 'low',
    streetCircuit: false,
    safetyCarLikelihood: 'medium',
  },
  monza: {
    circuitId: 'monza',
    name: 'Italy',
    aeroLoad: 'low',
    tireWear: 'low',
    overtakingDifficulty: 'easy',
    powerSensitivity: 'high',
    streetCircuit: false,
    safetyCarLikelihood: 'low',
  },
  baku: {
    circuitId: 'baku',
    name: 'Azerbaijan',
    aeroLoad: 'low',
    tireWear: 'low',
    overtakingDifficulty: 'easy',
    powerSensitivity: 'high',
    streetCircuit: true,
    safetyCarLikelihood: 'high', // historically chaotic, barriers, tyre failures
  },
  marina_bay: {
    circuitId: 'marina_bay',
    name: 'Singapore',
    aeroLoad: 'high',
    tireWear: 'low',
    overtakingDifficulty: 'hard',
    powerSensitivity: 'low',
    streetCircuit: true,
    safetyCarLikelihood: 'high', // almost always has SC/VSC
  },
  americas: {
    circuitId: 'americas',
    name: 'USA (Austin)',
    aeroLoad: 'medium',
    tireWear: 'high',
    overtakingDifficulty: 'medium',
    powerSensitivity: 'medium',
    streetCircuit: false,
    safetyCarLikelihood: 'medium',
  },
  rodriguez: {
    circuitId: 'rodriguez',
    name: 'Mexico',
    aeroLoad: 'high',
    tireWear: 'high',
    overtakingDifficulty: 'medium',
    powerSensitivity: 'low',
    streetCircuit: false,
    safetyCarLikelihood: 'low',
  },
  interlagos: {
    circuitId: 'interlagos',
    name: 'Brazil',
    aeroLoad: 'medium',
    tireWear: 'medium',
    overtakingDifficulty: 'medium',
    powerSensitivity: 'medium',
    streetCircuit: false,
    safetyCarLikelihood: 'medium', // variable weather, incidents common
  },
  las_vegas: {
    circuitId: 'las_vegas',
    name: 'Las Vegas',
    aeroLoad: 'low',
    tireWear: 'medium',
    overtakingDifficulty: 'easy',
    powerSensitivity: 'high',
    streetCircuit: true,
    safetyCarLikelihood: 'medium',
  },
  losail: {
    circuitId: 'losail',
    name: 'Qatar',
    aeroLoad: 'medium',
    tireWear: 'high',
    overtakingDifficulty: 'medium',
    powerSensitivity: 'medium',
    streetCircuit: false,
    safetyCarLikelihood: 'low',
  },
  yas_marina: {
    circuitId: 'yas_marina',
    name: 'Abu Dhabi',
    aeroLoad: 'medium',
    tireWear: 'high',
    overtakingDifficulty: 'easy',
    powerSensitivity: 'medium',
    streetCircuit: false,
    safetyCarLikelihood: 'low',
  },
};

export function getCircuitProfile(circuitId: string): CircuitProfile | null {
  if (CIRCUIT_PROFILES[circuitId]) return CIRCUIT_PROFILES[circuitId];

  // Fuzzy fallback: match partial circuit_id
  const lower = circuitId.toLowerCase();
  for (const key of Object.keys(CIRCUIT_PROFILES)) {
    if (lower.includes(key) || key.includes(lower)) {
      return CIRCUIT_PROFILES[key];
    }
  }
  return null;
}

// Similarity score between two circuit profiles (0-1)
export function circuitSimilarity(a: CircuitProfile, b: CircuitProfile): number {
  let score = 0;
  if (a.aeroLoad === b.aeroLoad) score += 0.25;
  if (a.tireWear === b.tireWear) score += 0.2;
  if (a.overtakingDifficulty === b.overtakingDifficulty) score += 0.2;
  if (a.powerSensitivity === b.powerSensitivity) score += 0.2;
  if (a.streetCircuit === b.streetCircuit) score += 0.15;
  return score;
}

// Weights for the prediction engine — adjusted per circuit profile
export interface CircuitWeights {
  qualifying: number;
  racePace: number;
  consistency: number;
  historical: number;
  teamCircuitAffinity: number;
  puAffinity: number;
}

export function getCircuitWeights(profile: CircuitProfile | null): CircuitWeights {
  if (!profile) {
    return {
      qualifying: 0.30,
      racePace: 0.40,
      consistency: 0.10,
      historical: 0.10,
      teamCircuitAffinity: 0.05,
      puAffinity: 0.05,
    };
  }

  // Qualifying weight: highest on no-overtaking circuits (Monaco), lowest on DRS fest (Monza)
  const qualyWeight =
    profile.overtakingDifficulty === 'hard' ? 0.45 :
    profile.overtakingDifficulty === 'medium' ? 0.30 :
    0.20;

  // Consistency/tire mgmt: highest on high-wear circuits
  const consistencyWeight =
    profile.tireWear === 'high' ? 0.18 :
    profile.tireWear === 'medium' ? 0.12 :
    0.06;

  // Race pace: inverse to qualifying weight
  const racePaceWeight = Math.max(0.25, 0.55 - (qualyWeight - 0.20) * 0.5);

  // PU affinity: highest on power-sensitive circuits
  const puWeight =
    profile.powerSensitivity === 'high' ? 0.09 :
    profile.powerSensitivity === 'medium' ? 0.06 :
    0.03;

  // Team circuit affinity: always meaningful
  const teamAffinityWeight = 0.07;

  // Historical: remainder
  const historical = Math.max(0.05, 1 - qualyWeight - consistencyWeight - racePaceWeight - puWeight - teamAffinityWeight);

  return {
    qualifying: qualyWeight,
    racePace: racePaceWeight,
    consistency: consistencyWeight,
    historical,
    teamCircuitAffinity: teamAffinityWeight,
    puAffinity: puWeight,
  };
}
