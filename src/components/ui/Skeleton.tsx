import React from 'react';
import { Card } from './Card';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full' }) => (
  <div className={`bg-gray-700/50 rounded animate-pulse ${className}`} />
);

export const StatCardSkeleton: React.FC = () => (
  <Card className="p-5">
    <div className="flex items-center justify-between">
      <div className="flex-1 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
      </div>
      <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
    </div>
  </Card>
);

export const PageSkeleton: React.FC<{ cards?: number }> = ({ cards = 4 }) => (
  <div className="space-y-6">
    <div className="flex items-center space-x-3">
      <Skeleton className="h-12 w-12 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-60" />
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    <Card className="p-5">
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </Card>
  </div>
);
