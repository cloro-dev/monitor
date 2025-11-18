import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export function useCompetitors(brandId?: string | null) {
  const getKey = () => {
    if (brandId) {
      return `/api/competitors?brandId=${brandId}`;
    }
    return '/api/competitors';
  };

  const { data, error, isLoading, mutate } = useSWR(getKey(), fetcher);

  return {
    competitors: data,
    error,
    isLoading,
    mutate,
  };
}
