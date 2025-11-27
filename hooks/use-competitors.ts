import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export interface Competitor {
  id: string;
  name: string;
  domain: string;
  mentions: number;
  visibilityScore: number | null;
  averageSentiment: number | null;
  averagePosition: number | null;
  status: 'ACCEPTED' | 'REJECTED' | null;
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface ChartSeries {
  id: string;
  name: string;
}

export interface CompetitorsApiResponse {
  selectedBrandName?: string;
  competitors: Competitor[];
  brandsToChart?: ChartSeries[]; // Changed from BrandsToChart[] to ChartSeries[]
  chartData?: ChartDataPoint[];
}

export function useCompetitors(
  brandId?: string | null,
  includeStats: boolean = false,
) {
  const getKey = () => {
    if (!brandId) return null; // Don't fetch if no brandId (now required)
    let url = '/api/competitors';
    const params = new URLSearchParams();
    params.append('brandId', brandId); // brandId is now required
    if (includeStats) params.append('includeStats', 'true');

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  };

  const { data, error, isLoading, mutate } = useSWR<
    CompetitorsApiResponse | Competitor[]
  >(getKey(), fetcher);

  const competitors: Competitor[] = Array.isArray(data)
    ? data
    : data?.competitors || [];
  const chartData: ChartDataPoint[] = !Array.isArray(data)
    ? data?.chartData || []
    : [];
  const selectedBrandName: string | undefined = !Array.isArray(data)
    ? data?.selectedBrandName
    : undefined;
  const brandsToChart: ChartSeries[] = !Array.isArray(data)
    ? data?.brandsToChart || []
    : [];

  return {
    competitors,
    chartData,
    selectedBrandName,
    brandsToChart,
    error,
    isLoading,
    mutate,
  };
}

export async function updateCompetitorStatus(
  id: string,
  status: 'ACCEPTED' | 'REJECTED' | null,
): Promise<void> {
  const response = await fetch('/api/competitors', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, status }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to update status (${response.status})`,
    );
  }
}
