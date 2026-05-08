'use client';

import { useEffect, useState } from 'react';
import { Constructor } from '@/types/f1';
import TeamCardHoverInfo from './TeamCardHoverInfo';
import TeamDriversList from './TeamDriversList';

interface TeamCardProps {
  constructor: Constructor;
  currentSeason: number;
}

// Mapping of team names to car image filenames for 2026 season
const TEAM_CAR_IMAGES: Record<string, string> = {
  'Ferrari': '/images/cars/2026-season/ferrari.png',
  'Red Bull': '/images/cars/2026-season/red-bull.png',
  'McLaren': '/images/cars/2026-season/mclaren.png',
  'Mercedes': '/images/cars/2026-season/mercedes.png',
  'Aston Martin': '/images/cars/2026-season/aston-martin.png',
  'Alpine F1 Team': '/images/cars/2026-season/alpine.png',
  'Williams': '/images/cars/2026-season/williams.png',
  'Haas F1 Team': '/images/cars/2026-season/haas.png',
  'RB F1 Team': '/images/cars/2026-season/rb.png',
  'Sauber': '/images/cars/2026-season/sauber.png',
};

function getCarImage(constructor: Constructor): string | null {
  // Try constructor's own car_image_url first
  if (constructor.car_image_url) return constructor.car_image_url;
  // Then try our local mapping
  return TEAM_CAR_IMAGES[constructor.name] || null;
}

const loadedTeamImages = new Set<string>();

function preloadImage(url: string) {
  if (loadedTeamImages.has(url)) return;
  const img = new Image();
  img.src = url;
  loadedTeamImages.add(url);
}

export default function TeamCard({ constructor, currentSeason }: TeamCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Team colors with fallback
  const primaryColor = constructor.team_color || '#DC0000';
  const secondaryColor = constructor.team_color_secondary || '#1a1a1a';
  const carImage = currentSeason === 2026 ? getCarImage(constructor) : null;

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
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${constructor.name} team information`}
    >
      {/* Background Image Layer — 2026 car visuals only */}
      <div className="absolute inset-0 z-0">
        {/* Car Image Background */}
        {carImage && (
          <div
            className={`
              absolute inset-0 bg-cover bg-center bg-no-repeat
              transition-all duration-700
              ${isHovered ? 'scale-110 opacity-80' : 'scale-100 opacity-55'}
            `}
            style={{
              backgroundImage: `url(${carImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: isHovered ? 'blur(0px)' : 'blur(1px)',
            }}
            aria-hidden="true"
          />
        )}

        {/* Dark overlay with team color accent — always present */}
        <div 
          className="absolute inset-0 z-10 transition-all duration-500"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}26 0%, rgba(0,0,0,0.46) 40%, rgba(0,0,0,0.62) 100%)`,
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

        {/* Glassmorphism effect on hover */}
        <div 
          className={`
            absolute inset-0 z-30
            backdrop-blur-[0.5px]
            transition-opacity duration-500
            ${isHovered ? 'opacity-20' : 'opacity-0'}
          `}
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
