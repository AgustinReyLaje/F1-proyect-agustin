'use client';

import { Driver } from '@/types/f1';

interface DriverListItemProps {
  driver: Driver;
  teamColor?: string | null;
  isSelected: boolean;
  onClick: () => void;
}

export default function DriverListItem({ 
  driver, 
  teamColor,
  isSelected, 
  onClick 
}: DriverListItemProps) {
  const borderColor = teamColor || '#DC0000';

  return (
    <button
      onClick={onClick}
      className={`
        w-full px-4 py-4 rounded-lg
        transition-all duration-300 ease-in-out
        text-left
        border-2
        ${isSelected 
          ? 'bg-gray-900/90 backdrop-blur-sm shadow-lg' 
          : 'bg-gray-800/60 backdrop-blur-sm hover:bg-gray-800/80'
        }
      `}
      style={{
        borderColor: borderColor,
        borderLeftWidth: '4px',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-white truncate transition-all duration-300 ${
            isSelected ? 'text-lg' : 'text-base'
          }`}>
            {driver.full_name}
          </h3>
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {driver.code}
          </p>
        </div>
        
        {driver.number && (
          <div 
            className={`
              ml-2 px-3 py-1 rounded font-bold text-white flex-shrink-0
              transition-all duration-300
              ${isSelected ? 'text-xl' : 'text-base'}
            `}
            style={{ backgroundColor: borderColor }}
          >
            {driver.number}
          </div>
        )}
      </div>
    </button>
  );
}
