'use client';

import { SWRConfig } from 'swr';
import { fetcher } from '@/lib/fetcher';
import { ReactNode } from 'react';

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        // Global configuration for all SWR hooks
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        // Don't retry on errors by default (can be overridden per hook)
        errorRetryCount: 0,
        // Cache configuration
        focusThrottleInterval: 5000,
        dedupingInterval: 2000,
        // Error handling
        errorRetryInterval: 5000,
        // Loading timeout
        loadingTimeout: 3000,
        // Refresh interval (disabled by default, can be enabled per hook)
        refreshInterval: 0,
      }}
    >
      {children}
    </SWRConfig>
  );
}
