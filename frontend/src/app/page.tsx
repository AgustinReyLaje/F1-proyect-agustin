'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Users, Trophy, Calendar, Zap, ChevronRight } from 'lucide-react';
import { f1Api } from '@/lib/api';
import { useSeason } from '@/contexts/SeasonContext';
import { ChampionshipStanding, Race, DriverSeason } from '@/types/f1';
import F1Logo from '@/components/F1Logo';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { filterCancelledRaces } from '@/lib/raceFilters';

export default function Home() {
  const { currentSeason } = useSeason();
  const [topDrivers, setTopDrivers] = useState<ChampionshipStanding[]>([]);
  const [featuredRace, setFeaturedRace] = useState<Race | null>(null);
  const [driverTeams, setDriverTeams] = useState<Map<number, { teamName: string; teamColor: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ drivers: 0, teams: 0, races: 0 });

  useEffect(() => {
    loadHomeData();
  }, [currentSeason]);

  const loadHomeData = async () => {
    try {
      setLoading(true);

      // Fetch standings for top 3
      const standingsRes = await f1Api.getStandings({
        season: currentSeason,
        standing_type: 'driver',
        round: 0,
      });
      const standingsData = standingsRes.data.results || standingsRes.data;
      const sorted = (Array.isArray(standingsData) ? standingsData : [])
        .sort((a: ChampionshipStanding, b: ChampionshipStanding) => a.position - b.position);
      setTopDrivers(sorted.slice(0, 3));

      // Fetch driver seasons for team colors
      const dsRes = await f1Api.getDriverSeasons({ season__year: currentSeason });
      const dsList = dsRes.data.results || dsRes.data;
      const teamMap = new Map<number, { teamName: string; teamColor: string }>();
      (dsList as DriverSeason[]).forEach((ds) => {
        teamMap.set(ds.driver.id, {
          teamName: ds.constructor.name,
          teamColor: ds.constructor.team_color || '#E10600',
        });
      });
      setDriverTeams(teamMap);

      // Fetch races for featured race
      const racesRes = await f1Api.getRaces({ season: currentSeason });
      let allRaces = racesRes.data.results || racesRes.data;
      let nextUrl = racesRes.data.next;
      while (nextUrl) {
        const nextRes = await fetch(nextUrl);
        const nextData = await nextRes.json();
        allRaces = [...allRaces, ...(nextData.results || [])];
        nextUrl = nextData.next;
      }
      const races: Race[] = filterCancelledRaces(Array.isArray(allRaces) ? allRaces : []);
      const sortedRaces = races.sort((a, b) => a.round - b.round);

      // Find the next upcoming race or most recent
      const now = new Date();
      const upcoming = sortedRaces.find((r) => new Date(r.date) >= now);
      const lastPast = sortedRaces.filter((r) => new Date(r.date) < now).pop();
      setFeaturedRace(upcoming || lastPast || sortedRaces[0] || null);

      // Stats
      const constructorsRes = await f1Api.getConstructors({ season: currentSeason });
      const constructorsData = constructorsRes.data.results || constructorsRes.data;
      setStats({
        drivers: dsList.length,
        teams: Array.isArray(constructorsData) ? constructorsData.length : 0,
        races: races.length,
      });

    } catch (err) {
      console.error('Error loading home data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCountdown = (race: Race) => {
    const raceDate = new Date(race.date);
    const now = new Date();
    const diff = raceDate.getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { days, hours };
  };

  const podiumOrder = [1, 0, 2]; // P2, P1, P3

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/images/tracks.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/90" />
        {/* Animated speed lines */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-[1px] bg-gradient-to-r from-transparent via-f1-red to-transparent animate-speedLine"
              style={{
                top: `${20 + i * 15}%`,
                left: '-100%',
                width: '200%',
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${3 + i * 0.5}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-7xl">
        {/* Hero Section */}
        <section className="text-center mb-16 animate-fadeIn">
          <div className="flex justify-center mb-8">
            <F1Logo size="lg" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
              FORMULA 1
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Advanced data analytics, real-time standings, and AI-powered race predictions for the {currentSeason} season
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/drivers"
              className="group px-8 py-3 bg-f1-red text-white rounded-lg hover:bg-red-700 transition-all font-bold text-lg shadow-lg shadow-red-500/20 hover:shadow-red-500/40 hover:scale-105"
            >
              Explore Data
              <ChevronRight className="inline ml-1 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/predictions"
              className="group px-8 py-3 border-2 border-f1-red text-f1-red rounded-lg hover:bg-f1-red hover:text-white transition-all font-bold text-lg hover:scale-105"
            >
              <Zap className="inline mr-2 w-5 h-5" />
              Predictions
            </Link>
          </div>
        </section>

        {loading ? (
          <LoadingSkeleton type="hero" />
        ) : (
          <>
            {/* Featured Race */}
            {featuredRace && (
              <section className="mb-16 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-f1-red mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {getCountdown(featuredRace) ? 'Next Race' : 'Latest Race'}
                </h2>
                <Link href={`/races/${featuredRace.id}`}>
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-gray-800/80 to-gray-900 border border-gray-700/50 p-8 hover:border-f1-red/50 transition-all duration-500 group cursor-pointer hover:shadow-2xl hover:shadow-red-500/10">
                    {/* Glow accent */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-f1-red via-red-400 to-f1-red" />

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                      <div className="flex-shrink-0">
                        <div className="bg-f1-red text-white px-6 py-4 rounded-xl text-center shadow-lg">
                          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Round</div>
                          <div className="text-4xl font-black">{featuredRace.round}</div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <h3 className="text-3xl font-black text-white mb-2 group-hover:text-f1-red transition-colors">
                          {featuredRace.race_name}
                        </h3>
                        <p className="text-gray-400 text-lg">{featuredRace.circuit_name}</p>
                        <p className="text-gray-500 mt-1">
                          {featuredRace.locality}, {featuredRace.country} •{' '}
                          {new Date(featuredRace.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>

                      {getCountdown(featuredRace) && (
                        <div className="flex gap-4 text-center">
                          <div className="bg-gray-800/80 rounded-xl px-5 py-3 border border-gray-700">
                            <div className="text-3xl font-black text-white">{getCountdown(featuredRace)!.days}</div>
                            <div className="text-xs text-gray-500 uppercase font-bold">Days</div>
                          </div>
                          <div className="bg-gray-800/80 rounded-xl px-5 py-3 border border-gray-700">
                            <div className="text-3xl font-black text-white">{getCountdown(featuredRace)!.hours}</div>
                            <div className="text-xs text-gray-500 uppercase font-bold">Hours</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Top 3 Drivers – Podium Style */}
            {topDrivers.length > 0 && (
              <section className="mb-16 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-f1-red mb-6 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Championship Leaders
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  {podiumOrder.map((idx) => {
                    const standing = topDrivers[idx];
                    if (!standing || !standing.driver) return <div key={idx} />;
                    const teamInfo = driverTeams.get(standing.driver.id);
                    const teamColor = teamInfo?.teamColor || '#E10600';
                    const isFirst = standing.position === 1;

                    const positionStyles: Record<number, { text: string; bg: string; border: string }> = {
                      1: { text: 'text-yellow-400', bg: 'from-yellow-500/20', border: 'border-yellow-400' },
                      2: { text: 'text-gray-300', bg: 'from-gray-400/20', border: 'border-gray-400' },
                      3: { text: 'text-orange-500', bg: 'from-orange-500/20', border: 'border-orange-500' },
                    };
                    const pStyle = positionStyles[standing.position] || positionStyles[3];

                    return (
                      <Link
                        href={`/drivers?driver=${standing.driver.id}`}
                        key={standing.driver.id}
                        className={`group relative overflow-hidden rounded-2xl bg-gradient-to-b ${pStyle.bg} to-gray-900/80 border-2 ${pStyle.border} 
                          ${isFirst ? 'md:-mt-8 md:pb-8' : ''} 
                          hover:scale-[1.03] transition-all duration-300 cursor-pointer
                          hover:shadow-xl`}
                        style={{ borderLeftWidth: '5px', borderLeftColor: teamColor }}
                      >
                        <div className="p-6 text-center">
                          <span className={`font-black ${isFirst ? 'text-7xl' : 'text-5xl'} ${pStyle.text} leading-none drop-shadow-lg block mb-3`}>
                            P{standing.position}
                          </span>
                          <h3 className={`font-bold text-white ${isFirst ? 'text-2xl' : 'text-xl'} mb-1`}>
                            {standing.driver.first_name}
                          </h3>
                          <h3 className={`font-black text-white uppercase ${isFirst ? 'text-3xl' : 'text-2xl'} tracking-wide`}>
                            {standing.driver.last_name}
                          </h3>
                          <p className="text-sm font-semibold mt-2" style={{ color: teamColor }}>
                            {teamInfo?.teamName || '—'}
                          </p>
                          <div className="mt-4 flex justify-center gap-6">
                            <div>
                              <div className="text-2xl font-black text-f1-red">{standing.points}</div>
                              <div className="text-[10px] uppercase text-gray-500 font-bold">Points</div>
                            </div>
                            <div>
                              <div className="text-2xl font-black text-white">{standing.wins}</div>
                              <div className="text-[10px] uppercase text-gray-500 font-bold">Wins</div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Quick Access Buttons */}
            <section className="mb-16 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { href: '/drivers', icon: Users, label: 'Drivers', desc: 'Full driver profiles & stats', color: '#E10600' },
                  { href: '/constructors', icon: Trophy, label: 'Teams', desc: 'Constructor standings & info', color: '#00D2BE' },
                  { href: '/races', icon: Calendar, label: 'Race Calendar', desc: 'Schedule & race results', color: '#FF8700' },
                  { href: '/predictions', icon: Zap, label: 'Predictions', desc: 'AI-powered race predictions', color: '#9B59B6' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className="group relative overflow-hidden rounded-xl bg-gray-900/80 border border-gray-700/50 p-6 hover:border-gray-600 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer h-full">
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                          style={{ background: `radial-gradient(circle at center, ${item.color}, transparent 70%)` }}
                        />
                        <Icon className="w-8 h-8 mb-3 transition-colors duration-300" style={{ color: item.color }} />
                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-gray-100">{item.label}</h3>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Live Stats */}
            <section className="mb-12 animate-fadeIn" style={{ animationDelay: '0.8s' }}>
              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                {[
                  { label: 'Drivers', value: stats.drivers || '20+' },
                  { label: 'Teams', value: stats.teams || '10' },
                  { label: 'Races', value: stats.races || '24' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-6 bg-gray-900/60 border border-gray-800 rounded-xl">
                    <div className="text-3xl font-black text-f1-red mb-1">{stat.value}</div>
                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-800/50">
          <p className="text-xs text-gray-600">
            {currentSeason} Season • Powered by Django REST Framework • Next.js • TypeScript
          </p>
        </div>
      </div>
    </main>
  );
}
