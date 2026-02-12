import Link from 'next/link';
import { Flag, TrendingUp, Users, Trophy } from 'lucide-react';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-16">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-f1-red rounded-full">
            <Flag className="w-16 h-16 text-white" />
          </div>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-f1-red to-red-700">
          F1 Analytics Platform
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Advanced Formula 1 data analytics, real-time standings, and AI-powered race predictions
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/drivers"
            className="px-8 py-3 bg-f1-red text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Explore Data
          </Link>
          <Link
            href="/standings"
            className="px-8 py-3 border-2 border-f1-red text-f1-red rounded-lg hover:bg-f1-red hover:text-white transition-all font-semibold"
          >
            View Standings
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <Link href="/drivers">
          <FeatureCard
            icon={<Users className="w-12 h-12 text-f1-red" />}
            title="Driver Analytics"
            description="Comprehensive driver statistics, performance trends, and head-to-head comparisons"
          />
        </Link>
        <Link href="/standings">
          <FeatureCard
            icon={<Trophy className="w-12 h-12 text-f1-red" />}
            title="Championship Standings"
            description="Real-time championship standings for drivers and constructors throughout the season"
          />
        </Link>
        <Link href="/races">
          <FeatureCard
            icon={<TrendingUp className="w-12 h-12 text-f1-red" />}
            title="Race Calendar"
            description="Complete race schedule with circuit information and race results"
          />
        </Link>
      </div>

      {/* Stats Section */}
      <div className="mt-20 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Platform Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard label="Drivers" value="20+" />
          <StatCard label="Constructors" value="10" />
          <StatCard label="Races" value="24" />
          <StatCard label="Data Points" value="10K+" />
        </div>
      </div>

      {/* API Status */}
      <div className="mt-16 text-center">
        <p className="text-sm text-gray-500">
          Powered by Django REST Framework • PostgreSQL • Next.js
        </p>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-f1-red">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="text-3xl font-bold text-f1-red mb-2">{value}</div>
      <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
    </div>
  );
}
