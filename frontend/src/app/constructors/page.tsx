'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { f1Api } from '@/lib/api';
import { Constructor } from '@/types/f1';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import TeamCard from '@/components/TeamCard';
import { useSeason } from '@/contexts/SeasonContext';

export default function ConstructorsPage() {
  const [constructors, setConstructors] = useState<Constructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { currentSeason } = useSeason();

  useEffect(() => {
    loadConstructors();
  }, [currentSeason]);

  const loadConstructors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await f1Api.getConstructors({ season: currentSeason });
      // Handle paginated response
      const data = response.data.results || response.data;
      setConstructors(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load constructors. Please try again later.');
      console.error('Error loading constructors:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredConstructors = constructors.filter((constructor) =>
    searchTerm === '' ||
    constructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    constructor.nationality.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        {/* Dark overlay for better readability */}
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
          <h1 className="text-4xl font-bold mb-2 text-white">F1 Constructors</h1>
          <p className="text-gray-300">
            Browse all Formula 1 teams in the {currentSeason} season
          </p>
        </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or nationality..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg bg-gray-900/80 backdrop-blur-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-f1-red focus:border-transparent outline-none"
          />
        </div>
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
            onClick={loadConstructors}
            className="mt-4 px-6 py-2 bg-f1-red text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Constructors Grid */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredConstructors.map((constructor) => (
              <TeamCard key={constructor.id} constructor={constructor} />
            ))}
          </div>

          {filteredConstructors.length === 0 && (
            <div className="text-center py-20">
              <p className="text-xl text-gray-300">
                No constructors found matching your criteria
              </p>
            </div>
          )}
        </>
      )}
      </main>
    </div>
  );
}
