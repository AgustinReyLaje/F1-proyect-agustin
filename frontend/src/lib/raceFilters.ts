import { Race } from '@/types/f1';

const CANCELLED_RACE_NAMES = new Set([
  'bahrain grand prix',
  'saudi arabian grand prix',
]);

function normalizeRaceName(race: Race | { race_name?: string; name?: string } | null | undefined): string {
  if (!race) return '';
  const raceName = ('race_name' in race ? race.race_name : 'name' in race ? (race as any).name : '') || '';
  return raceName.trim().toLowerCase();
}

export function isCancelledRace(race: Race | { race_name?: string; name?: string } | null | undefined): boolean {
  return CANCELLED_RACE_NAMES.has(normalizeRaceName(race));
}

export function filterCancelledRaces<T extends Race>(races: T[]): T[] {
  return races.filter((race) => !isCancelledRace(race));
}
