'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export interface LoadingBoundaryProps {
  isLoading?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showSpinner?: boolean;
  loadingText?: string;
  hasData?: boolean; // New prop to know if data exists
}

export function LoadingBoundary({
  isLoading = false,
  children,
  fallback,
  showSpinner = false,
  loadingText = 'Loading...',
  hasData = false,
}: LoadingBoundaryProps) {
  // Show skeleton ONLY if loading AND no data yet
  if (isLoading && !hasData) {
    // If custom fallback is provided, use it
    if (fallback) {
      return <>{fallback}</>;
    }

    // If showSpinner is true, show a simple spinner
    if (showSpinner) {
      return (
        <div className="flex min-h-96 items-center justify-center">
          <div className="space-y-4 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">{loadingText}</p>
          </div>
        </div>
      );
    }

    // Default skeleton with better visibility
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-4 w-96 bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-10 w-full bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-10 w-full bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  // Show children if not loading and has data
  return <>{children}</>;
}
