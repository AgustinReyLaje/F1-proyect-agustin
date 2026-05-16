export type PUSupplier = 'Mercedes' | 'Ferrari' | 'Honda' | 'Ford' | 'Audi';

// 2026 season PU supplier per team (team name as used in the backend)
export const PU_BY_TEAM_2026: Record<string, PUSupplier> = {
  // Mercedes PU
  'Mercedes': 'Mercedes',
  'McLaren': 'Mercedes',
  'Alpine F1 Team': 'Mercedes',
  'Alpine': 'Mercedes',
  'Williams': 'Mercedes',

  // Ferrari PU
  'Ferrari': 'Ferrari',
  'Haas F1 Team': 'Ferrari',
  'Haas': 'Ferrari',
  'Cadillac': 'Ferrari',
  'Andretti': 'Ferrari',

  // Honda PU
  'Aston Martin': 'Honda',

  // Ford/RBPT PU
  'Red Bull': 'Ford',
  'Red Bull Racing': 'Ford',
  'RB F1 Team': 'Ford',
  'Racing Bulls': 'Ford',
  'VCARB': 'Ford',

  // Audi PU
  'Sauber': 'Audi',
  'Kick Sauber': 'Audi',
  'Audi': 'Audi',
};

// Which teams share each PU
export const TEAMS_BY_PU_2026: Record<PUSupplier, string[]> = {
  Mercedes: ['Mercedes', 'McLaren', 'Alpine F1 Team', 'Alpine', 'Williams'],
  Ferrari:  ['Ferrari', 'Haas F1 Team', 'Haas', 'Cadillac'],
  Honda:    ['Aston Martin'],
  Ford:     ['Red Bull', 'Red Bull Racing', 'RB F1 Team', 'Racing Bulls', 'VCARB'],
  Audi:     ['Sauber', 'Kick Sauber'],
};

export function getPUSupplier(teamName: string): PUSupplier | null {
  if (PU_BY_TEAM_2026[teamName]) return PU_BY_TEAM_2026[teamName];

  // Fuzzy fallback
  const lower = teamName.toLowerCase();
  for (const [key, supplier] of Object.entries(PU_BY_TEAM_2026)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return supplier;
    }
  }
  return null;
}

export function getTeamsWithSamePU(teamName: string): string[] {
  const supplier = getPUSupplier(teamName);
  if (!supplier) return [];
  return TEAMS_BY_PU_2026[supplier].filter((t) => t !== teamName);
}
