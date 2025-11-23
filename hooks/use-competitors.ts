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
    let url = '/api/competitors';
    const params = new URLSearchParams();
    if (brandId) params.append('brandId', brandId);
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
