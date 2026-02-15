'use client';

import { Constructor } from '@/types/f1';
import { Trophy, Calendar, MapPin } from 'lucide-react';

interface TeamCardHoverInfoProps {
  constructor: Constructor;
  isHovered: boolean;
  primaryColor: string;
}

export default function TeamCardHoverInfo({
  constructor,
  isHovered,
  primaryColor,
}: TeamCardHoverInfoProps) {
  return (
    <div
      className={`
        space-y-3 overflow-hidden
        transition-all duration-500 ease-out
        ${isHovered 
          ? 'opacity-100 max-h-96 translate-y-0' 
          : 'opacity-0 max-h-0 translate-y-4 pointer-events-none'
        }
      `}
      aria-hidden={!isHovered}
    >
      {/* Nationality */}
      <div 
        className="flex items-center justify-between p-3 rounded-lg backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-300" aria-hidden="true" />
          <span className="text-sm text-gray-300">Nationality</span>
        </div>
        <span className="font-semibold text-white">
          {constructor.nationality}
        </span>
      </div>

      {/* Championship Standing */}
      {constructor.championship_position && (
        <div 
          className="p-3 rounded-lg backdrop-blur-sm"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderLeft: `3px solid ${primaryColor}`
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-200">Championship Standing</span>
            </div>
          </div>
          
          <div className="flex items-baseline gap-3">
            <span 
              className={`text-3xl font-bold ${
                constructor.championship_position.position === 1 
                  ? 'text-yellow-400' 
                  : constructor.championship_position.position === 2 
                  ? 'text-gray-300' 
                  : constructor.championship_position.position === 3 
                  ? 'text-orange-600' 
                  : ''
              }`}
              style={
                constructor.championship_position.position > 3 
                  ? { color: primaryColor } 
                  : undefined
              }
              aria-label={`Position ${constructor.championship_position.position}`}
            >
              P{constructor.championship_position.position}
            </span>
            <div className="text-right flex-1">
              <div className="text-xl font-bold text-white">
                {constructor.championship_position.points}
                <span className="text-sm font-normal text-gray-300 ml-1">pts</span>
              </div>
              {constructor.championship_position.wins > 0 && (
                <div className="text-sm text-gray-300">
                  {constructor.championship_position.wins} {constructor.championship_position.wins === 1 ? 'win' : 'wins'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Additional Info - Can be extended */}
      {constructor.car_model && (
        <div 
          className="p-3 rounded-lg backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-300" aria-hidden="true" />
              <span className="text-sm text-gray-300">2024 Season</span>
            </div>
            <span className="font-semibold text-white">
              Active
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
