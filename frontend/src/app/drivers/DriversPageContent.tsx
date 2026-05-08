'use client';

import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { f1Api } from '@/lib/api';
import { DriverSeason } from '@/types/f1';
import { ArrowLeft, Search, Loader2, Users } from 'lucide-react';
import { useSeason } from '@/contexts/SeasonContext';
import DriverListItem from '@/components/DriverListItem';
import DriverDetailsPanel from '@/components/DriverDetailsPanel';

export default function DriversPageContent() {
  const [driverSeasons, setDriverSeasons] = useState<DriverSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNationality, setSelectedNationality] = useState('');
  const [selectedDriverSeasonId, setSelectedDriverSeasonId] = useState<number | null>(null);
  const { currentSeason } = useSeason();
  const searchParams = useSearchParams();

  useEffect(() => {
    loadDrivers();
  }, [currentSeason]);

  // Handle driver selection from URL query parameter
  useEffect(() => {
    const driverIdParam = searchParams.get('driver');
    if (driverIdParam && driverSeasons.length > 0) {
      const driverId = parseInt(driverIdParam);
      const driverSeason = driverSeasons.find((ds: DriverSeason) => ds.driver.id === driverId);
      if (driverSeason) {
        setSelectedDriverSeasonId(driverSeason.id);
      }
    }
  }, [searchParams, driverSeasons]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await f1Api.getDriverSeasons({ season__year: currentSeason });
      // Handle paginated response
      const data = response.data.results || response.data;
      const driversList = Array.isArray(data) ? (data as DriverSeason[]) : [];
      setDriverSeasons(driversList);
      
      // Auto-select driver from URL param or first driver
      const driverIdParam = searchParams.get('driver');
      if (driverIdParam) {
        const driverId = parseInt(driverIdParam);
        const driverSeason = driversList.find(ds => ds.driver.id === driverId);
        if (driverSeason) {
          setSelectedDriverSeasonId(driverSeason.id);
          return;
        }
      }
      
      // Fallback to first driver
      if (driversList.length > 0 && !selectedDriverSeasonId) {
        setSelectedDriverSeasonId(driversList[0].id);
      }
    } catch (err) {
      setError('Failed to load drivers. Please try again later.');
      console.error('Error loading drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDriverSeasons = driverSeasons.filter((driverSeason: DriverSeason) => {
    const driver = driverSeason.driver;
    const matchesSearch =
      searchTerm === '' ||
      driver.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driverSeason.constructor.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNationality =
      selectedNationality === '' || driver.nationality === selectedNationality;
    return matchesSearch && matchesNationality;
  });

  // Group filtered drivers by team
  const groupedByTeam = useMemo(() => {
    const groups = new Map<string, { teamColor: string | null; drivers: DriverSeason[] }>();
    
    filteredDriverSeasons.forEach((ds: DriverSeason) => {
      const teamName = ds.constructor.name;
      const existing = groups.get(teamName);
      if (existing) {
        existing.drivers.push(ds);
      } else {
        groups.set(teamName, {
          teamColor: ds.constructor.team_color,
          drivers: [ds],
        });
      }
    });
    
    // Sort teams alphabetically
    const sorted = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
    return sorted;
  }, [filteredDriverSeasons]);

  const nationalities = Array.from(
    new Set(driverSeasons.map((ds: DriverSeason) => ds.driver.nationality))
  ).sort();
  
  const selectedDriverSeason = selectedDriverSeasonId 
    ? driverSeasons.find((ds: DriverSeason) => ds.id === selectedDriverSeasonId) 
    : null;

  return (
    <div className="relative min-h-screen">
      {/* Background Image with Overlay */}
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/75" />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-f1-red transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2 text-white">F1 Drivers</h1>
          <p className="text-gray-300">
            Browse all Formula 1 drivers in the {currentSeason} season — grouped by team
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by driver, code, or team..."
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg bg-gray-900/80 backdrop-blur-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-f1-red focus:border-transparent outline-none"
            />
          </div>
          <select
            value={selectedNationality}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedNationality(e.target.value)}
            className="px-4 py-3 border border-gray-600 rounded-lg bg-gray-900/80 backdrop-blur-sm text-white focus:ring-2 focus:ring-f1-red focus:border-transparent outline-none"
          >
            <option value="">All Nationalities</option>
            {nationalities.map((nat) => (
              <option key={nat} value={nat}>
                {nat}
              </option>
            ))}
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-f1-red" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-900/30 backdrop-blur-sm border border-red-500/50 rounded-lg p-6 text-center">
            <p className="text-red-200">{error}</p>
            <button
              onClick={loadDrivers}
              className="mt-4 px-6 py-2 bg-f1-red text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Drivers Layout: Left Column (Grouped by Team) + Right Panel */}
        {!loading && !error && (
          <div className="flex gap-6 h-[calc(100vh-200px)]">
            {/* Left Column - Driver List Grouped by Team */}
            <div className="w-96 flex-shrink-0 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {groupedByTeam.map(([teamName, { teamColor, drivers }]: [string, { teamColor: string | null; drivers: DriverSeason[] }]) => (
                <div key={teamName} className="animate-fadeIn">
                  {/* Team Header */}
                  <div 
                    className="flex items-center gap-3 px-4 py-3 rounded-t-lg border-b-2"
                    style={{ 
                      backgroundColor: `${teamColor || '#333'}20`,
                      borderBottomColor: teamColor || '#555',
                    }}
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: teamColor || '#555' }}
                    />
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="font-bold text-white text-sm uppercase tracking-wider">
                      {teamName}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">{drivers.length} drivers</span>
                  </div>
                  
                  {/* Team Drivers */}
                  <div className="space-y-1 pt-1">
                    {drivers.map((driverSeason) => (
                      <DriverListItem
                        key={driverSeason.id}
                        driver={driverSeason.driver}
                        teamColor={driverSeason.constructor.team_color}
                        isSelected={selectedDriverSeasonId === driverSeason.id}
                        onClick={() => setSelectedDriverSeasonId(driverSeason.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              
              {filteredDriverSeasons.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-gray-400">
                    No drivers found matching your criteria
                  </p>
                </div>
              )}
            </div>

            {/* Right Panel - Driver Details */}
            <div className="flex-1 min-w-0 h-full overflow-hidden">
              {selectedDriverSeason ? (
                <div className="h-full overflow-y-auto custom-scrollbar">
                  <DriverDetailsPanel driverSeason={selectedDriverSeason} />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-900/90 backdrop-blur-sm rounded-lg">
                  <p className="text-gray-400 text-lg">Select a driver to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
