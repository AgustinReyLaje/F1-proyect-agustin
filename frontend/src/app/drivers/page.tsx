'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { f1Api } from '@/lib/api';
import { Driver } from '@/types/f1';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { useSeason } from '@/contexts/SeasonContext';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNationality, setSelectedNationality] = useState('');
  const { currentSeason } = useSeason();

  useEffect(() => {
    loadDrivers();
  }, [currentSeason]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await f1Api.getDrivers({ season: currentSeason });
      // Handle paginated response
      const data = response.data.results || response.data;
      setDrivers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load drivers. Please try again later.');
      console.error('Error loading drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      searchTerm === '' ||
      driver.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNationality =
      selectedNationality === '' || driver.nationality === selectedNationality;
    return matchesSearch && matchesNationality;
  });

  const nationalities = Array.from(
    new Set(drivers.map((d) => d.nationality))
  ).sort();

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-f1-red transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <h1 className="text-4xl font-bold mb-2">F1 Drivers</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Browse all Formula 1 drivers in the {currentSeason} season
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-f1-red focus:border-transparent outline-none"
          />
        </div>
        <select
          value={selectedNationality}
          onChange={(e) => setSelectedNationality(e.target.value)}
          className="px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-f1-red focus:border-transparent outline-none"
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
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={loadDrivers}
            className="mt-4 px-6 py-2 bg-f1-red text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Drivers Grid */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDrivers.map((driver) => (
              <DriverCard key={driver.id} driver={driver} />
            ))}
          </div>

          {filteredDrivers.length === 0 && (
            <div className="text-center py-20">
              <p className="text-xl text-gray-500">
                No drivers found matching your criteria
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function DriverCard({ driver }: { driver: Driver }) {
  return (
    <div 
      id={`driver-${driver.id}`}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all p-6 border-l-4 border-f1-red scroll-mt-20"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold mb-1">{driver.full_name}</h3>
          <p className="text-gray-600 dark:text-gray-400">{driver.nationality}</p>
        </div>
        {driver.number && (
          <div className="bg-f1-red text-white px-3 py-1 rounded-lg font-bold text-lg">
            #{driver.number}
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm">
        {driver.code && (
          <div className="flex justify-between">
            <span className="text-gray-500">Code:</span>
            <span className="font-semibold">{driver.code}</span>
          </div>
        )}
        {driver.date_of_birth && (
          <div className="flex justify-between">
            <span className="text-gray-500">Born:</span>
            <span className="font-semibold">
              {new Date(driver.date_of_birth).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {driver.url && (
        <a
          href={driver.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block text-center text-f1-red hover:text-red-700 font-medium text-sm"
        >
          View Profile →
        </a>
      )}
    </div>
  );
}
