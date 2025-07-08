import React from 'react';
import { SkeletonLoader } from './SkeletonLoader';

export const TankListItemSkeleton: React.FC = () => (
  <div
    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
    aria-label="Loading tank data"
  >
    <div className="flex items-center justify-between">
      {/* Left side - tank info */}
      <div className="flex items-center space-x-4 flex-1">
        {/* Tank name and location */}
        <div className="space-y-1">
          <SkeletonLoader width="120px" height="18px" />
          <SkeletonLoader width="80px" height="14px" />
        </div>

        {/* Level display */}
        <div className="text-center">
          <SkeletonLoader width="80px" height="20px" className="mb-1" />
          <SkeletonLoader width="50px" height="14px" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex-1 mx-6">
        <SkeletonLoader width="100%" height="8px" />
      </div>

      {/* Right side - status and trend */}
      <div className="flex items-center space-x-3">
        <SkeletonLoader variant="circular" width="12px" height="12px" />
        <div className="flex items-center space-x-1">
          <SkeletonLoader variant="circular" width="16px" height="16px" />
          <SkeletonLoader width="60px" height="14px" />
        </div>
      </div>
    </div>
  </div>
);
