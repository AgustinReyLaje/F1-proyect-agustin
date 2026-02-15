'use client';

import { useState } from 'react';
import { Driver, DriverSeasonData } from '@/types/f1';
import DriverCard from '@/components/DriverCard';

interface DriversSectionProps {
  drivers: Driver[];
  driversSeasonData?: Map<number, DriverSeasonData>;
}

export default function DriversSection({ 
  drivers, 
  driversSeasonData 
}: DriversSectionProps) {
  const [hoveredDriverId, setHoveredDriverId] = useState<number | null>(null);

  const handleDriverHover = (driverId: number, isHovered: boolean) => {
    setHoveredDriverId(isHovered ? driverId : null);
  };

  return (
    <section 
      className="relative"
      aria-label="Drivers list"
    >
      {/* Grid layout - responsive: vertical on mobile, grid on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max">
        {drivers.map((driver) => {
          const isOtherHovered = hoveredDriverId !== null && hoveredDriverId !== driver.id;
          const seasonData = driversSeasonData?.get(driver.id);

          return (
            <div
              key={driver.id}
              className={`
                transition-all duration-500 ease-in-out
                ${hoveredDriverId === driver.id ? 'col-span-full' : ''}
              `}
            >
              <DriverCard
                driver={driver}
                seasonData={seasonData}
                isOtherHovered={isOtherHovered}
                onHoverChange={(isHovered) => handleDriverHover(driver.id, isHovered)}
              />
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {drivers.length === 0 && (
        <div className="text-center py-20">
          <p className="text-xl text-gray-500 dark:text-gray-400">
            No drivers found
          </p>
        </div>
      )}
    </section>
  );
}
