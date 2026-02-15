'use client';

import Link from 'next/link';
import { Driver } from '@/types/f1';
import { Users } from 'lucide-react';

interface TeamDriversListProps {
  drivers: Driver[];
  isHovered: boolean;
  primaryColor: string;
}

export default function TeamDriversList({
  drivers,
  isHovered,
  primaryColor,
}: TeamDriversListProps) {
  if (!drivers || drivers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Users 
          className={`
            w-4 h-4 transition-colors duration-300
            ${isHovered ? 'text-gray-200' : 'text-gray-500 dark:text-gray-400'}
          `}
          aria-hidden="true"
        />
        <h4 
          className={`
            text-sm font-medium transition-colors duration-300
            ${isHovered ? 'text-gray-200' : 'text-gray-500 dark:text-gray-400'}
          `}
        >
          Drivers
        </h4>
      </div>

      <ul className="space-y-2" role="list">
        {drivers.map((driver, index) => (
          <li key={driver.id}>
            <Link
              href={`/drivers?driver=${driver.id}`}
              className={`
                flex items-center justify-between p-3 rounded-lg
                transition-all duration-300
                focus:outline-none focus:ring-2 focus:ring-offset-2
                ${isHovered 
                  ? 'bg-black/40 hover:bg-black/60' 
                  : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                }
              `}
              style={{
                animationDelay: `${index * 50}ms`,
                transitionDelay: isHovered ? `${index * 50}ms` : '0ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = primaryColor;
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
              aria-label={`View ${driver.full_name} driver profile`}
            >
              <span 
                className={`
                  font-medium transition-colors duration-300
                  ${isHovered ? 'text-white' : 'text-gray-900 dark:text-gray-100'}
                `}
              >
                {driver.full_name}
              </span>
              
              {driver.number && (
                <span 
                  className={`
                    text-sm font-bold transition-all duration-300
                    px-2 py-1 rounded
                    ${isHovered 
                      ? 'text-white bg-white/20' 
                      : 'text-gray-600 dark:text-gray-300'
                    }
                  `}
                  aria-label={`Driver number ${driver.number}`}
                >
                  #{driver.number}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
