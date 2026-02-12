// F1 Data Types matching Django backend models

export interface Driver {
  id: number;
  driver_id: string;
  number: number | null;
  code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth: string | null;
  nationality: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface Constructor {
  id: number;
  constructor_id: string;
  name: string;
  nationality: string;
  url: string;
  car_model: string | null;
  car_image_url: string | null;
  team_color: string | null;
  team_color_secondary: string | null;
  drivers: Driver[];
  championship_position: {
    position: number;
    points: number;
    wins: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface Race {
  id: number;
  race_id: string;
  season: number;
  round: number;
  race_name: string;
  circuit_id: string;
  circuit_name: string;
  locality: string;
  country: string;
  date: string;
  time: string | null;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface Result {
  id: number;
  race: Race;
  driver: Driver;
  constructor: Constructor;
  grid_position: number;
  final_position: number | null;
  position_text: string;
  points: number;
  laps_completed: number;
  status: 'finished' | 'dnf' | 'dsq' | 'dns' | 'retired';
  fastest_lap: number | null;
  fastest_lap_time: string | null;
  fastest_lap_speed: number | null;
  created_at: string;
  updated_at: string;
}

export interface Lap {
  id: number;
  race: Race;
  driver: Driver;
  lap_number: number;
  position: number;
  lap_time: string;
  lap_time_milliseconds: number | null;
  created_at: string;
}

export interface ChampionshipStanding {
  id: number;
  season: number;
  standing_type: 'driver' | 'constructor';
  round: number;
  driver: Driver | null;
  constructor: Constructor | null;
  position: number;
  points: number;
  wins: number;
  created_at: string;
  updated_at: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Filter Types
export interface DriverFilters {
  nationality?: string;
  search?: string;
  ordering?: string;
}

export interface RaceFilters {
  season?: number;
  round?: number;
  country?: string;
  ordering?: string;
}

export interface StandingFilters {
  season?: number;
  standing_type?: 'driver' | 'constructor';
  round?: number;
  ordering?: string;
}
