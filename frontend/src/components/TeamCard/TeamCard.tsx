'use client';

import { useState } from 'react';
import { Constructor } from '@/types/f1';
import TeamCardHoverInfo from './TeamCardHoverInfo';
import TeamDriversList from './TeamDriversList';

interface TeamCardProps {
  constructor: Constructor;
}

export default function TeamCard({ constructor }: TeamCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Team colors with fallback
  const primaryColor = constructor.team_color || '#DC0000';
  const secondaryColor = constructor.team_color_secondary || '#1a1a1a';

  // Championship position glow effect - ALWAYS visible for top 3
  // Enhanced with stronger, more noticeable effects
  const getChampionshipGlow = () => {
    if (!constructor.championship_position) return '';
    
    switch (constructor.championship_position.position) {
      case 1:
        // Gold glow - Strong and prominent
        return isHovered 
          ? 'shadow-[0_0_50px_rgba(255,215,0,0.9),0_0_30px_rgba(255,215,0,0.7),0_0_15px_rgba(255,215,0,0.5)] ring-4 ring-yellow-400/70'
          : 'shadow-[0_0_35px_rgba(255,215,0,0.6),0_0_20px_rgba(255,215,0,0.4),0_0_10px_rgba(255,215,0,0.3)] ring-2 ring-yellow-400/50';
      case 2:
        // Silver glow - Strong and noticeable
        return isHovered
          ? 'shadow-[0_0_45px_rgba(192,192,192,0.85),0_0_25px_rgba(192,192,192,0.65),0_0_12px_rgba(192,192,192,0.45)] ring-4 ring-gray-300/70'
          : 'shadow-[0_0_30px_rgba(192,192,192,0.55),0_0_18px_rgba(192,192,192,0.35),0_0_8px_rgba(192,192,192,0.25)] ring-2 ring-gray-300/50';
      case 3:
        // Bronze glow - Strong and noticeable
        return isHovered
          ? 'shadow-[0_0_45px_rgba(205,127,50,0.85),0_0_25px_rgba(205,127,50,0.65),0_0_12px_rgba(205,127,50,0.45)] ring-4 ring-orange-600/70'
          : 'shadow-[0_0_30px_rgba(205,127,50,0.55),0_0_18px_rgba(205,127,50,0.35),0_0_8px_rgba(205,127,50,0.25)] ring-2 ring-orange-600/50';
      default:
        return '';
    }
  };

  return (
    <article
      className={`
        relative overflow-hidden rounded-2xl
        bg-white dark:bg-gray-800
        transition-all duration-500 ease-out
        group cursor-pointer
        ${isHovered ? 'scale-[1.03] z-20' : 'scale-100 z-10'}
        ${getChampionshipGlow() || 'shadow-lg hover:shadow-2xl'}
      `}
      style={{ 
        borderLeft: `4px solid ${primaryColor}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${constructor.name} team information`}
    >
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        {/* Gradient overlay - always present for readability */}
        <div 
          className="absolute inset-0 z-10 transition-opacity duration-500"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}40 50%, #00000085 100%)`
          }}
        />

        {/* Car Image Background - Using background-image for better control */}
        {constructor.car_image_url && (
          <div
            className={`
              absolute inset-0 bg-cover bg-center bg-no-repeat
              transition-all duration-700
              ${isHovered ? 'opacity-50 scale-110' : 'opacity-0 scale-100'}
            `}
            style={{
              backgroundImage: `url(${constructor.car_image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
            aria-hidden="true"
          />
        )}

        {/* Dark overlay on hover for better text contrast */}
        <div 
          className={`
            absolute inset-0 z-20
            bg-gradient-to-t from-black/90 via-black/40 to-transparent
            transition-opacity duration-500
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
        />

        {/* Glassmorphism effect on hover */}
        <div 
          className={`
            absolute inset-0 z-30
            backdrop-blur-[2px]
            transition-opacity duration-500
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-40 p-6 space-y-4">
        {/* Header - Always Visible */}
        <header className="space-y-2">
          <h3 
            className={`
              text-2xl font-bold tracking-tight
              transition-all duration-300
              ${isHovered ? 'text-white font-extrabold translate-y-[-2px]' : 'text-gray-900 dark:text-white'}
            `}
          >
            {constructor.name}
          </h3>
          
          {constructor.car_model && (
            <p 
              className="text-lg font-semibold transition-all duration-300"
              style={{ 
                color: isHovered ? '#ffffff' : primaryColor 
              }}
            >
              {constructor.car_model}
            </p>
          )}
        </header>

        {/* Hover Info - Slides in from bottom */}
        <TeamCardHoverInfo
          constructor={constructor}
          isHovered={isHovered}
          primaryColor={primaryColor}
        />

        {/* Drivers List - Always visible but transforms on hover */}
        <TeamDriversList
          drivers={constructor.drivers}
          isHovered={isHovered}
          primaryColor={primaryColor}
        />

        {/* Footer Link */}
        {constructor.url && (
          <footer className="pt-4 border-t border-gray-200/20">
            <a
              href={constructor.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                block text-center text-sm font-medium
                transition-all duration-300
                hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2
                ${isHovered ? 'text-white' : ''}
              `}
              style={{ 
                color: isHovered ? '#ffffff' : primaryColor,
                focusRingColor: primaryColor 
              }}
              aria-label={`View ${constructor.name} official profile`}
            >
              View Team Profile →
            </a>
          </footer>
        )}
      </div>

      {/* Championship Position Badge - Top Right Corner */}
      {constructor.championship_position && (
        <div 
          className={`
            absolute top-4 right-4 z-50
            px-3 py-1 rounded-full font-bold text-sm
            transition-all duration-300
            ${isHovered ? 'scale-110' : 'scale-100'}
          `}
          style={{
            backgroundColor: isHovered ? primaryColor : `${primaryColor}20`,
            color: isHovered ? '#ffffff' : primaryColor,
            border: `2px solid ${primaryColor}`,
          }}
          aria-label={`Championship position ${constructor.championship_position.position}`}
        >
          P{constructor.championship_position.position}
        </div>
      )}
    </article>
  );
}
