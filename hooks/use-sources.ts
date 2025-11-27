'use client';

import useSWR from 'swr';
import { useAuth } from './use-auth';

// Types for sources data
export interface DomainStat {
  domain: string;
  mentions: number;
  avgPosition: number;
  utilization: number;
  type?: string;
  uniquePrompts: number;
}

export interface URLStat {
  url: string;
  hostname: string;
  mentions: number;
  avgPosition: number;
  utilization: number;
  type?: string;
  uniquePrompts: number;
}

export interface SourcesData {
  domainStats: DomainStat[];
  urlStats: URLStat[];
  chartData: {
    data: any[];
    config: Record<string, { label: string; color: string }>;
  };
  summary: {
    totalPrompts: number;
    totalResults: number;
    totalDomains: number;
    totalUrls: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SourcesQueryParams {
  brandId?: string | null;
  timeRange: '7d' | '30d' | '90d';
  tab: 'domain' | 'url';
  page: number;
  limit: number;
}

/**
 * Hook for fetching sources data efficiently
 */
export function useSources(params: SourcesQueryParams) {
  const { isAuthenticated } = useAuth();

  const getKey = () => {
    if (!isAuthenticated) return null;

    const queryParams = new URLSearchParams({
      brandId: params.brandId || '',
      timeRange: params.timeRange,
      tab: params.tab,
      page: params.page.toString(),
      limit: params.limit.toString(),
    });

    return `/api/sources?${queryParams}`;
  };

  const { data, error, isLoading, mutate } = useSWR<any>(
    getKey,
    async (url: string) => {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jsonData = await response.json();
        return jsonData;
      } catch (error) {
        console.error('Error fetching sources:', error);
        throw error;
      }
    },
    {
      revalidateOnFocus: false, // Don't refetch on window focus
      dedupingInterval: 5 * 60 * 1000, // Dedupe requests within 5 minutes
      refreshInterval: 0, // Disable auto-refresh
      errorRetryCount: 3, // Retry failed requests 3 times
      errorRetryInterval: 5000, // Retry every 5 seconds
      keepPreviousData: true, // Keep previous data while loading
      onSuccess: (data) => {
        console.log(
          `Sources data loaded in ${data.meta?.queryTime || 'unknown'}`,
        );
      },
      onError: (error) => {
        console.error('Failed to load sources data:', error);
      },
    },
  );

  const processedData =
    data?.success && data.data
      ? {
          domainStats: data.data.domainStats || [],
          urlStats: data.data.urlStats || [],
          chartData: data.data.chartData || { data: [], config: {} },
          summary: data.data.summary || {
            totalPrompts: 0,
            totalResults: 0,
            totalDomains: 0,
            totalUrls: 0,
          },
          pagination: data.data.pagination || {
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 1,
          },
          meta: data.meta,
        }
      : null;

  return {
    data: processedData,
    isLoading,
    error,
    mutate,
    isSuccess: !error && !isLoading && !!data?.success,
    isError: !!error,
  };
}

/**
 * Hook for sources pagination management
 */
export function useSourcesPagination(totalItems: number, limit: number) {
  return {
    totalPages: limit > 0 ? Math.ceil(totalItems / limit) : 1,
    hasNextPage: (currentPage: number) =>
      currentPage < Math.ceil(totalItems / limit),
    hasPrevPage: (currentPage: number) => currentPage > 1,
    getNextPage: (currentPage: number) =>
      Math.min(currentPage + 1, Math.ceil(totalItems / limit)),
    getPrevPage: (currentPage: number) => Math.max(currentPage - 1, 1),
  };
}
