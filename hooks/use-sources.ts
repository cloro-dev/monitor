'use client';

import useSWR from 'swr';
import { useAuth } from './use-auth';

// Types for sources data
export interface DomainStat {
  domain: string;
  mentions: number;
  utilization: number;
  type?: string;
  uniquePrompts: number;
}

export interface URLStat {
  url: string;
  hostname: string;
  mentions: number;
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
  brandId: string;
  timeRange: '7d' | '30d' | '90d';
  tab: 'domain' | 'url';
  page: number;
  limit: number;
}

/**
 * Hook for fetching sources data efficiently
 */
export function useSources(params: SourcesQueryParams | null) {
  const { isAuthenticated } = useAuth();

  const getKey = () => {
    if (!isAuthenticated || !params?.brandId) return null;

    const queryParams = new URLSearchParams();

    queryParams.append('brandId', params.brandId);
    queryParams.append('timeRange', params.timeRange);
    queryParams.append('tab', params.tab);
    queryParams.append('page', params.page.toString());
    queryParams.append('limit', params.limit.toString());

    return `/api/sources?${queryParams}`;
  };

  const { data, error, isLoading, mutate } = useSWR<any>(
    getKey,
    async (url: string) => {
      console.log(`[useSources] Fetching: ${url}`);
      try {
        const response = await fetch(url);
        console.log(`[useSources] Response status: ${response.status}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jsonData = await response.json();
        console.log(`[useSources] Data received:`, jsonData);
        return jsonData;
      } catch (error) {
        console.error('[useSources] Error fetching sources:', error);
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
          `[useSources] Success: Loaded in ${data.meta?.queryTime || 'unknown'}`,
        );
      },
      onError: (error) => {
        console.error('[useSources] Failed to load sources data:', error);
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
