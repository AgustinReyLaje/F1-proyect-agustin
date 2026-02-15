'use client';

import { DriverSeason } from '@/types/f1';
import { Trophy, Award, Calendar, Flag, Crown, User, MapPin } from 'lucide-react';

interface DriverDetailsPanelProps {
  driverSeason: DriverSeason;
}

export default function DriverDetailsPanel({ driverSeason }: DriverDetailsPanelProps) {
  const { driver, constructor, career_stats, current_standing } = driverSeason;
  const teamColor = constructor.team_color || '#DC0000';
  const teamColorSecondary = constructor.team_color_secondary || teamColor;

  return (
    <div 
      className="h-full flex flex-col rounded-lg overflow-hidden border-2 shadow-2xl"
      style={{ 
        borderColor: teamColor,
        background: `linear-gradient(to bottom, ${teamColor}15 0%, #111827 40%)`,
      }}
    >
      {/* Header with team colors */}
      <div 
        className="relative h-64 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${teamColor}40 0%, ${teamColorSecondary || teamColor}20 100%)`,
        }}
      >
        {/* Driver Image/Silhouette placeholder */}
        <div className="absolute inset-0 flex items-end justify-center opacity-20">
          <User className="w-64 h-64 text-white" />
        </div>
        
        {/* Gradient overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, #111827 0%, transparent 80%)`,
          }}
        />
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-4xl font-black text-white mb-2 drop-shadow-2xl">
                {driver.full_name}
              </h2>
              <div className="flex items-center gap-3 text-white/90">
                {driver.code && (
                  <>
                    <span 
                      className="text-xl font-bold px-2 py-1 rounded"
                      style={{ backgroundColor: teamColor }}
                    >
                      {driver.code}
                    </span>
                    <span className="text-sm">•</span>
                  </>
                )}
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{driver.nationality}</span>
              </div>
              <p 
                className="text-xl font-bold mt-3 drop-shadow-lg"
                style={{ color: teamColor }}
              >
                {constructor.name}
              </p>
            </div>
            
            {driver.number && (
              <div 
                className="text-9xl font-black leading-none select-none opacity-30"
                style={{ 
                  color: teamColor,
                  textShadow: `0 0 60px ${teamColor}`,
                }}
              >
                {driver.number}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="flex-1 p-6 overflow-y-auto bg-gray-900/95 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-4">
          {/* Current Championship Position */}
          {current_standing && (
            <StatCard
              icon={<Trophy className="w-5 h-5" />}
              label="Championship Position"
              value={`P${current_standing.position}`}
              sublabel={`${current_standing.points} pts`}
              color={teamColor}
              highlight={current_standing.position <= 3}
            />
          )}

          {/* World Championships */}
          <StatCard
            icon={<Crown className="w-5 h-5" />}
            label="World Championships"
            value={career_stats.world_championships > 0 ? `${career_stats.world_championships}×` : '0'}
            color={teamColor}
            highlight={career_stats.world_championships > 0}
          />

          {/* Total Race Wins */}
          <StatCard
            icon={<Trophy className="w-5 h-5" />}
            label="Total Race Wins"
            value={`${career_stats.total_wins}`}
            color={teamColor}
          />

          {/* Total Podiums */}
          <StatCard
            icon={<Award className="w-5 h-5" />}
            label="Total Podiums"
            value={`${career_stats.total_podiums}`}
            color={teamColor}
          />

          {/* Total Seasons in F1 */}
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="Total Seasons in F1"
            value={`${career_stats.total_seasons}`}
            color={teamColor}
          />

          {/* Best Championship Finish */}
          {career_stats.best_championship_finish && (
            <StatCard
              icon={<Trophy className="w-5 h-5" />}
              label="Best Championship Finish"
              value={`P${career_stats.best_championship_finish}`}
              color={teamColor}
              highlight={career_stats.best_championship_finish === 1}
            />
          )}

          {/* Best Finish (Current Season) */}
          {career_stats.best_season_finish && (
            <StatCard
              icon={<Flag className="w-5 h-5" />}
              label="Best Finish (This Season)"
              value={`P${career_stats.best_season_finish}`}
              sublabel={current_standing ? `${current_standing.wins} ${current_standing.wins === 1 ? 'win' : 'wins'}` : undefined}
              color={teamColor}
            />
          )}

          {/* Age */}
          {driver.age && (
            <StatCard
              icon={<User className="w-5 h-5" />}
              label="Age"
              value={`${driver.age} years`}
              sublabel={driver.date_of_birth ? new Date(driver.date_of_birth).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              }) : undefined}
              color={teamColor}
            />
          )}

          {/* Career Points */}
          <StatCard
            icon={<Trophy className="w-5 h-5" />}
            label="Career Points"
            value={`${career_stats.career_points.toFixed(0)}`}
            color={teamColor}
          />
        </div>

        {/* Team Car Info */}
        {constructor.car_model && (
          <div 
            className="mt-6 p-4 rounded-lg border-2"
            style={{ 
              borderColor: teamColor,
              background: `${teamColor}10`,
            }}
          >
            <p className="text-sm text-gray-400 mb-1">Car Model</p>
            <p className="text-xl font-bold text-white">{constructor.car_model}</p>
          </div>
        )}
      </div>
    </div>
 );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  color: string;
  highlight?: boolean;
}

function StatCard({ icon, label, value, sublabel, color, highlight }: StatCardProps) {
  return (
    <div 
      className={`
        rounded-lg p-4 border-2 transition-all duration-300
        ${highlight 
          ? 'border-yellow-400/60 shadow-lg shadow-yellow-500/20' 
          : 'border-white/10 hover:border-white/20'
        }
      `}
      style={{
        background: highlight 
          ? `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)`
          : `linear-gradient(135deg, ${color}15 0%, transparent 100%)`,
      }}
    >
      <div className="flex items-center gap-2 text-white/70 text-xs mb-2">
        <span style={{ color: highlight ? '#fbbf24' : color }}>
          {icon}
        </span>
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <div 
        className="text-3xl font-black text-white mb-1"
        style={{ textShadow: `0 0 20px ${color}40` }}
      >
        {value}
      </div>
      {sublabel && (
        <div className="text-xs text-gray-400">{sublabel}</div>
      )}
    </div>
  );
}
