'use client';

import { useState } from 'react';
import { Driver, DriverSeasonData } from '@/types/f1';
import { Trophy, Award, Calendar, Flag } from 'lucide-react';

interface DriverCardProps {
  driver: Driver;
  seasonData?: DriverSeasonData;
  isOtherHovered: boolean;
  onHoverChange: (isHovered: boolean) => void;
}

export default function DriverCard({
  driver,
  seasonData,
  isOtherHovered,
  onHoverChange
}: DriverCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHoverChange(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHoverChange(false);
  };

  const teamColor = seasonData?.team_color || '#DC0000';
  const teamColorSecondary = seasonData?.team_color_secondary || '#1a1a1a';

  const getChampionshipGlow = () => {
    if (!seasonData?.championship_position) return '';
    switch (seasonData.championship_position) {
      case 1:
        return isHovered
          ? 'shadow-[0_0_40px_rgba(255,215,0,0.8)] ring-4 ring-yellow-400/60'
          : 'shadow-[0_0_25px_rgba(255,215,0,0.5)] ring-2 ring-yellow-400/40';
      case 2:
        return isHovered
          ? 'shadow-[0_0_40px_rgba(192,192,192,0.75)] ring-4 ring-gray-300/60'
          : 'shadow-[0_0_25px_rgba(192,192,192,0.45)] ring-2 ring-gray-300/40';
      case 3:
        return isHovered
          ? 'shadow-[0_0_40px_rgba(205,127,50,0.75)] ring-4 ring-orange-600/60'
          : 'shadow-[0_0_25px_rgba(205,127,50,0.45)] ring-2 ring-orange-600/40';
      default:
        return '';
    }
  };

  return (
    <article
      className={`
        relative overflow-hidden rounded-2xl
        transition-all duration-500 ease-out
        group cursor-pointer
        ${isHovered ? 'scale-[1.03] z-20' : 'scale-100 z-10'}
        ${isOtherHovered && !isHovered ? 'opacity-50' : 'opacity-100'}
        ${getChampionshipGlow() || 'shadow-lg hover:shadow-2xl'}
      `}
      style={{
        borderLeft: `4px solid ${teamColor}`,
        boxShadow: isHovered
          ? `0 0 40px ${teamColor}30, 0 20px 50px rgba(0,0,0,0.5)`
          : undefined,
        willChange: 'transform',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={`${driver.full_name} driver information`}
    >
      {/* Background layers */}
      <div className="absolute inset-0 z-0">
        {/* Driver image */}
        {seasonData?.driver_image_url && (
          <div
            className={`
              absolute inset-0 bg-cover bg-no-repeat
              transition-all duration-700
              ${isHovered ? 'opacity-30 scale-110' : 'opacity-0 scale-100'}
            `}
            style={{
              backgroundImage: `url(${seasonData.driver_image_url})`,
              backgroundPosition: 'center 20%',
            }}
            aria-hidden="true"
          />
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 z-10 transition-all duration-500"
          style={{
            background: isHovered
              ? `linear-gradient(135deg, ${teamColor}40 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.6) 100%)`
              : `linear-gradient(135deg, ${teamColor}10 0%, ${teamColorSecondary}15 50%, #00000020 100%)`,
          }}
        />

        {/* Bottom glow line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 z-20 transition-all duration-500"
          style={{
            background: `linear-gradient(90deg, transparent, ${teamColor}, transparent)`,
            opacity: isHovered ? 1 : 0.4,
            boxShadow: isHovered ? `0 0 20px ${teamColor}60` : 'none',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-40 p-6 space-y-4">
        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <h3
              className={`
                text-xl font-bold text-white tracking-tight
                transition-all duration-300
                ${isHovered ? 'text-2xl font-extrabold' : ''}
              `}
            >
              {driver.full_name}
            </h3>
            {seasonData?.team_name && (
              <p
                className="text-sm font-semibold mt-1 transition-colors duration-300"
                style={{ color: isHovered ? '#ffffff' : teamColor }}
              >
                {seasonData.team_name}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{driver.nationality}</p>
          </div>

          {driver.number && (
            <div
              className={`
                px-3 py-1.5 rounded-lg font-bold text-white text-xl
                transition-all duration-300
                ${isHovered ? 'scale-110' : 'scale-100'}
              `}
              style={{
                backgroundColor: isHovered ? teamColor : `${teamColor}30`,
                border: `2px solid ${teamColor}`,
              }}
            >
              {driver.number}
            </div>
          )}
        </header>

        {/* Stats — slide in on hover */}
        <div
          className={`
            grid grid-cols-2 gap-3
            transition-all duration-500 ease-out
            ${isHovered ? 'opacity-100 translate-y-0 max-h-48' : 'opacity-0 translate-y-4 max-h-0 overflow-hidden'}
          `}
        >
          {seasonData?.championship_position && (
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-1.5 text-white/70 text-xs mb-1">
                <Trophy className="w-3 h-3" />
                <span>Championship</span>
              </div>
              <div className="text-xl font-bold text-white">P{seasonData.championship_position}</div>
              {seasonData.championship_points !== undefined && (
                <div className="text-xs text-white/60">{seasonData.championship_points} pts</div>
              )}
            </div>
          )}

          {seasonData?.best_finish && (
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-1.5 text-white/70 text-xs mb-1">
                <Flag className="w-3 h-3" />
                <span>Best Finish</span>
              </div>
              <div className="text-xl font-bold text-white">P{seasonData.best_finish}</div>
              {seasonData.wins !== undefined && seasonData.wins > 0 && (
                <div className="text-xs text-white/60">{seasonData.wins} win{seasonData.wins !== 1 ? 's' : ''}</div>
              )}
            </div>
          )}

          {seasonData?.years_in_f1 && (
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-1.5 text-white/70 text-xs mb-1">
                <Calendar className="w-3 h-3" />
                <span>Years in F1</span>
              </div>
              <div className="text-xl font-bold text-white">{seasonData.years_in_f1}</div>
              {seasonData.debut_year && (
                <div className="text-xs text-white/60">Since {seasonData.debut_year}</div>
              )}
            </div>
          )}

          {seasonData?.podiums !== undefined && seasonData.podiums > 0 && (
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-1.5 text-white/70 text-xs mb-1">
                <Award className="w-3 h-3" />
                <span>Podiums</span>
              </div>
              <div className="text-xl font-bold text-white">{seasonData.podiums}</div>
            </div>
          )}
        </div>

        {/* Driver code badge */}
        {driver.code && (
          <div
            className={`
              text-xs font-mono font-bold tracking-widest
              transition-all duration-300
              ${isHovered ? 'text-white' : 'text-gray-500'}
            `}
          >
            {driver.code}
          </div>
        )}
      </div>

      {/* Championship position badge */}
      {seasonData?.championship_position && (
        <div
          className={`
            absolute top-4 right-4 z-50
            px-2.5 py-1 rounded-full font-bold text-xs
            transition-all duration-300
            ${isHovered ? 'scale-110 opacity-0' : 'scale-100 opacity-100'}
          `}
          style={{
            backgroundColor: `${teamColor}30`,
            color: '#ffffff',
            border: `2px solid ${teamColor}`,
          }}
        >
          P{seasonData.championship_position}
        </div>
      )}
    </article>
  );
}
