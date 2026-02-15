'use client';

import { useState } from 'react';
import { Driver, DriverSeasonData } from '@/types/f1';
import DriverCardHoverInfo from './DriverCardHoverInfo';

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

  // Get team color or fallback to F1 red
  const teamColor = seasonData?.team_color || '#DC0000';
  const teamColorSecondary = seasonData?.team_color_secondary || '#1a1a1a';

  // Championship position glow for top 3
  const getChampionshipGlow = () => {
    if (!seasonData?.championship_position) return '';
    
    switch (seasonData.championship_position) {
      case 1:
        return isHovered 
          ? 'shadow-[0_0_40px_rgba(255,215,0,0.8),0_0_25px_rgba(255,215,0,0.6)] ring-4 ring-yellow-400/60'
          : 'shadow-[0_0_25px_rgba(255,215,0,0.5),0_0_15px_rgba(255,215,0,0.3)] ring-2 ring-yellow-400/40';
      case 2:
        return isHovered
          ? 'shadow-[0_0_40px_rgba(192,192,192,0.75),0_0_25px_rgba(192,192,192,0.55)] ring-4 ring-gray-300/60'
          : 'shadow-[0_0_25px_rgba(192,192,192,0.45),0_0_15px_rgba(192,192,192,0.25)] ring-2 ring-gray-300/40';
      case 3:
        return isHovered
          ? 'shadow-[0_0_40px_rgba(205,127,50,0.75),0_0_25px_rgba(205,127,50,0.55)] ring-4 ring-orange-600/60'
          : 'shadow-[0_0_25px_rgba(205,127,50,0.45),0_0_15px_rgba(205,127,50,0.25)] ring-2 ring-orange-600/40';
      default:
        return '';
    }
  };

  return (
    <article
      className={`
        relative overflow-hidden rounded-2xl
        bg-white dark:bg-gray-800
        transition-all duration-500 ease-in-out
        group cursor-pointer
        ${isHovered 
          ? 'scale-105 z-50 w-[65vw] min-h-[350px]' 
          : 'scale-100 z-10 w-full'
        }
        ${isOtherHovered && !isHovered 
          ? 'opacity-40 scale-95' 
          : 'opacity-100'
        }
        ${getChampionshipGlow() || 'shadow-lg hover:shadow-2xl'}
      `}
      style={{ 
        borderLeft: `4px solid ${teamColor}`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={`${driver.full_name} driver information`}
    >
      {/* Background gradient overlay */}
      <div 
        className="absolute inset-0 z-0 transition-opacity duration-500"
        style={{
          background: isHovered 
            ? `linear-gradient(135deg, ${teamColor}20 0%, ${teamColorSecondary}30 50%, #00000070 100%)`
            : `linear-gradient(135deg, ${teamColor}10 0%, ${teamColorSecondary}15 50%, #00000020 100%)`
        }}
      />

      {/* Driver image background - visible on hover */}
      {seasonData?.driver_image_url && (
        <div
          className={`
            absolute inset-0 bg-cover bg-center bg-no-repeat
            transition-all duration-700
            ${isHovered ? 'opacity-30 scale-110' : 'opacity-0 scale-100'}
          `}
          style={{
            backgroundImage: `url(${seasonData.driver_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 20%',
          }}
          aria-hidden="true"
        />
      )}

      {/* Dark overlay on hover for text contrast */}
      <div 
        className={`
          absolute inset-0 z-10
          bg-gradient-to-t from-black/85 via-black/40 to-transparent
          transition-opacity duration-500
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}
      />

      {/* Content Container */}
      <div className="relative z-20 p-6 h-full">
        {!isHovered ? (
          // Compact View
          <div className="flex items-center justify-between h-full">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">
                {driver.full_name}
              </h3>
              {seasonData?.team_name && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {seasonData.team_name}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {driver.nationality}
              </p>
            </div>
            
            {driver.number && (
              <div 
                className="px-4 py-2 rounded-lg font-bold text-2xl text-white"
                style={{ backgroundColor: teamColor }}
              >
                {driver.number}
              </div>
            )}
          </div>
        ) : (
          // Expanded Hover View
          <DriverCardHoverInfo 
            driver={driver} 
            seasonData={seasonData}
            teamColor={teamColor}
          />
        )}
      </div>
    </article>
  );
}
