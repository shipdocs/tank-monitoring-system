import React from 'react';
import { SkeletonLoader } from './SkeletonLoader';

export const CompactTankCardSkeleton: React.FC = () => (
  <article
    className="bg-white rounded-lg shadow-md border border-gray-200 p-3"
    aria-label="Loading tank data"
  >
    <div className="flex items-center justify-between mb-2">
      {/* Tank name skeleton */}
      <SkeletonLoader width="80px" height="18px" />
      {/* Status dot skeleton */}
      <SkeletonLoader variant="circular" width="12px" height="12px" />
    </div>

    <div className="space-y-2">
      {/* Level display skeleton */}
      <div className="text-center">
        <SkeletonLoader width="100px" height="24px" className="mx-auto mb-1" />
        <SkeletonLoader width="60px" height="16px" className="mx-auto" />
      </div>

      {/* Progress bar skeleton */}
      <SkeletonLoader width="100%" height="16px" />

      {/* Additional info skeleton */}
      <div className="flex justify-between text-xs">
        <SkeletonLoader width="40px" height="12px" />
        <SkeletonLoader width="30px" height="12px" />
      </div>
    </div>
  </article>
);
