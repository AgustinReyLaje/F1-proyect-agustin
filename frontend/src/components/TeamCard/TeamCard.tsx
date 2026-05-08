'use client';

import { memo, useEffect, useState } from 'react';
import { Constructor } from '@/types/f1';
import TeamCardHoverInfo from './TeamCardHoverInfo';
import TeamDriversList from './TeamDriversList';

interface TeamCardProps {
  constructor: Constructor;
  currentSeason?: number;
}

const loadedImages = new Set<string>();

function preloadImage(url: string) {
  if (loadedImages.has(url)) return;
  const img = new Image();
  img.src = url;
  loadedImages.add(url);
}

function TeamCard({ constructor }: TeamCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const primaryColor = constructor.team_color || '#DC0000';
  const carImage = constructor.car_image_url ?? null;

  useEffect(() => {
    if (carImage) preloadImage(carImage);
  }, [carImage]);

  return (
    <article
      className={`
        relative overflow-hidden rounded-2xl
        transition-all duration-500 ease-out
        group cursor-pointer
        ${isHovered ? 'scale-[1.03] z-20' : 'scale-100 z-10'}
      `}
      style={{
        borderLeft: `4px solid ${primaryColor}`,
        boxShadow: isHovered
          ? `0 0 40px ${primaryColor}30, 0 20px 50px rgba(0,0,0,0.5)`
          : `0 4px 20px rgba(0,0,0,0.3)`,
        willChange: 'transform',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${constructor.name} team information`}
    >
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        {/* Car Image Background */}
        {carImage && (
          <div
            className={`
              absolute inset-0 bg-no-repeat
              transition-all duration-700
              ${isHovered ? 'scale-110 opacity-95' : 'scale-100 opacity-80'}
            `}
            style={{
              backgroundImage: `url(${carImage})`,
              backgroundSize: '105%',
              backgroundPosition: 'center 40%',
            }}
            aria-hidden="true"
          />
        )}

        {/* Dark overlay with team color accent — always present */}
        <div
          className="absolute inset-0 z-10 transition-all duration-500"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}40 0%, rgba(0,0,0,0.28) 40%, rgba(0,0,0,0.48) 100%)`,
          }}
        />

        {/* Team color glow at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 z-20 transition-all duration-500"
          style={{
            background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
            opacity: isHovered ? 1 : 0.5,
            boxShadow: isHovered ? `0 0 20px ${primaryColor}60` : 'none',
          }}
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-40 p-6 space-y-4">
        {/* Header - Always Visible */}
        <header className="space-y-2">
          <h3 
            className={`
              text-2xl font-bold tracking-tight text-white
              transition-all duration-300
              ${isHovered ? 'font-extrabold translate-y-[-2px]' : ''}
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
          <footer className="pt-4 border-t border-white/10">
            <a
              href={constructor.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                block text-center text-sm font-medium
                transition-all duration-300
                hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2
                text-white/80 hover:text-white
              `}
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
            backgroundColor: isHovered ? primaryColor : `${primaryColor}30`,
            color: '#ffffff',
            border: `2px solid ${primaryColor}`,
            boxShadow: isHovered ? `0 0 15px ${primaryColor}40` : 'none',
          }}
          aria-label={`Championship position ${constructor.championship_position.position}`}
        >
          P{constructor.championship_position.position}
        </div>
      )}
    </article>
  );
}

export default memo(TeamCard);
