import React from 'react';
import { SkeletonLoader } from './SkeletonLoader';

export const TankCardSkeleton: React.FC = () => (
  <article
    className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200"
    aria-label="Loading tank data"
  >
    {/* Header skeleton */}
    <div className="bg-gradient-to-r from-gray-300 to-gray-400 p-4 rounded-t-xl">
      <div className="flex items-center justify-between">
        <SkeletonLoader width="120px" height="24px" className="bg-white bg-opacity-30" />
        <div className="flex items-center space-x-2">
          <SkeletonLoader variant="circular" width="12px" height="12px" className="bg-white bg-opacity-30" />
          <SkeletonLoader width="80px" height="16px" className="bg-white bg-opacity-30" />
        </div>
      </div>
    </div>

    <div className="p-4 space-y-4">
      {/* Main level display skeleton */}
      <div className="text-center space-y-2">
        <SkeletonLoader width="120px" height="36px" className="mx-auto" />
        <SkeletonLoader width="80px" height="24px" className="mx-auto" />
      </div>

      {/* Progress bar skeleton */}
      <div className="space-y-2">
        <SkeletonLoader width="100%" height="24px" />
        <div className="flex justify-between">
          <SkeletonLoader width="20px" height="12px" />
          <SkeletonLoader width="40px" height="12px" />
        </div>
      </div>

      {/* Info grid skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-2 space-y-1">
          <SkeletonLoader width="60px" height="12px" className="mx-auto" />
          <SkeletonLoader width="40px" height="20px" className="mx-auto" />
        </div>
        <div className="bg-gray-50 rounded-lg p-2 space-y-1">
          <SkeletonLoader width="50px" height="12px" className="mx-auto" />
          <SkeletonLoader width="30px" height="16px" className="mx-auto" />
        </div>
      </div>

      {/* Trend indicator skeleton */}
      <div className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
        <SkeletonLoader variant="circular" width="16px" height="16px" />
        <SkeletonLoader width="60px" height="16px" />
        <SkeletonLoader width="40px" height="12px" />
      </div>

      {/* Last update skeleton */}
      <div className="flex items-center justify-center space-x-1">
        <SkeletonLoader variant="circular" width="12px" height="12px" />
        <SkeletonLoader width="80px" height="12px" />
      </div>
    </div>
  </article>
);
