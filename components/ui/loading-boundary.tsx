'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export interface LoadingBoundaryProps {
  isLoading?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showSpinner?: boolean;
  loadingText?: string;
}

export function LoadingBoundary({
  isLoading = false,
  children,
  fallback,
  showSpinner = false,
  loadingText = 'Loading...',
}: LoadingBoundaryProps) {
  // Show children if not loading
  if (!isLoading) {
    return <>{children}</>;
  }

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

  // Default skeleton that works for most pages
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
