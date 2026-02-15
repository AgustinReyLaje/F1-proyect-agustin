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

  return (
    <article
      className={`
        relative overflow-hidden rounded-2xl
        bg-white dark:bg-gray-800
        transition-all duration-500 ease-out
        group cursor-pointer
        shadow-lg hover:shadow-2xl
        ${isHovered ? 'scale-[1.03] z-20' : 'scale-100 z-10'}
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
