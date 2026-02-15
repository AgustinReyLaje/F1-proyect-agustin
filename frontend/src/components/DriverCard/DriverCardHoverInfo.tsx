'use client';

import { Driver, DriverSeasonData } from '@/types/f1';
import { Trophy, Award, Calendar, Flag } from 'lucide-react';

interface DriverCardHoverInfoProps {
  driver: Driver;
  seasonData?: DriverSeasonData;
  teamColor: string;
}

export default function DriverCardHoverInfo({ 
  driver, 
  seasonData,
  teamColor 
}: DriverCardHoverInfoProps) {
  return (
    <div className="h-full flex flex-col justify-between animate-fadeIn">
      {/* Top Section: Driver Info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
            {driver.full_name}
          </h2>
          <div className="flex items-center gap-2 text-white/90 mb-1">
            <span className="text-lg font-semibold">{driver.code}</span>
            <span className="text-sm">•</span>
            <span className="text-sm">{driver.nationality}</span>
          </div>
          {seasonData?.team_name && (
            <p className="text-white/80 text-lg font-medium mt-2">
              {seasonData.team_name}
            </p>
          )}
        </div>
        
        {/* Large stylized driver number */}
        {driver.number && (
          <div 
            className="text-8xl md:text-9xl font-black text-white/20 leading-none"
            style={{ textShadow: `0 0 30px ${teamColor}` }}
          >
            {driver.number}
          </div>
        )}
      </div>

      {/* Bottom Section: Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-auto">
        {/* Championship Position */}
        {seasonData?.championship_position && (
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
              <Trophy className="w-4 h-4" />
              <span>Championship</span>
            </div>
            <div className="text-2xl font-bold text-white">
              P{seasonData.championship_position}
            </div>
            {seasonData.championship_points !== undefined && (
              <div className="text-xs text-white/60 mt-1">
                {seasonData.championship_points} pts
              </div>
            )}
          </div>
        )}

        {/* Best Finish */}
        {seasonData?.best_finish && (
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
              <Flag className="w-4 h-4" />
              <span>Best Finish</span>
            </div>
            <div className="text-2xl font-bold text-white">
              P{seasonData.best_finish}
            </div>
            {seasonData.wins !== undefined && seasonData.wins > 0 && (
              <div className="text-xs text-white/60 mt-1">
                {seasonData.wins} {seasonData.wins === 1 ? 'win' : 'wins'}
              </div>
            )}
          </div>
        )}

        {/* Years in F1 */}
        {seasonData?.years_in_f1 && (
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
              <Calendar className="w-4 h-4" />
              <span>Years in F1</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {seasonData.years_in_f1}
            </div>
            {seasonData.debut_year && (
              <div className="text-xs text-white/60 mt-1">
                Since {seasonData.debut_year}
              </div>
            )}
          </div>
        )}

        {/* Podiums or Additional Stat */}
        {seasonData?.podiums !== undefined && seasonData.podiums > 0 && (
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
              <Award className="w-4 h-4" />
              <span>Podiums</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {seasonData.podiums}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
