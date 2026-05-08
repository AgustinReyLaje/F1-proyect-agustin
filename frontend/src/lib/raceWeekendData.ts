import { f1Api } from '@/lib/api';
import { FreePractice, Qualifying } from '@/types/f1';

export interface DriverWeekendData {
  driverId: number;
  teamId: number;
  teamName: string;
  teamColor: string | null;
  qualifyingPosition: number | null;
  bestPracticePositions: Partial<Record<'FP1' | 'FP2' | 'FP3', number>>;
}

export interface RaceWeekendData {
  qualifying: Qualifying[];
  freePractice: FreePractice[];
  byDriver: Map<number, DriverWeekendData>;
}

export async function getRaceWeekendData(raceId: number): Promise<RaceWeekendData> {
  const [qualifyingRes, freePracticeRes] = await Promise.allSettled([
    f1Api.getQualifying({ race: raceId }),
    f1Api.getFreePractice({ race: raceId }),
  ]);

  const qualifying: Qualifying[] =
    qualifyingRes.status === 'fulfilled'
      ? (qualifyingRes.value.data.results || qualifyingRes.value.data || [])
      : [];

  const freePractice: FreePractice[] =
    freePracticeRes.status === 'fulfilled'
      ? (freePracticeRes.value.data.results || freePracticeRes.value.data || [])
      : [];

  const byDriver = new Map<number, DriverWeekendData>();

  qualifying.forEach((entry) => {
    byDriver.set(entry.driver.id, {
      driverId: entry.driver.id,
      teamId: entry.constructor.id,
      teamName: entry.constructor.name,
      teamColor: entry.constructor.team_color,
      qualifyingPosition: entry.position,
      bestPracticePositions: {},
    });
  });

  freePractice.forEach((entry) => {
    const existing = byDriver.get(entry.driver.id);
    if (!existing) {
      byDriver.set(entry.driver.id, {
        driverId: entry.driver.id,
        teamId: entry.constructor.id,
        teamName: entry.constructor.name,
        teamColor: entry.constructor.team_color,
        qualifyingPosition: null,
        bestPracticePositions: { [entry.session]: entry.position },
      });
      return;
    }

    const currentBest = existing.bestPracticePositions[entry.session];
    if (!currentBest || entry.position < currentBest) {
      existing.bestPracticePositions[entry.session] = entry.position;
    }
  });

  return { qualifying, freePractice, byDriver };
}
