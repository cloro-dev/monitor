import useSWR from 'swr';
import { post, patch, del } from '@/lib/fetcher';
import { useAuth } from './use-auth';

interface Brand {
  id: string;
  domain: string;
  name: string | null;
  description: string | null;
  defaultCountry: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BrandsResponse {
  brands: Brand[];
}

export function useBrands() {
  const { session } = useAuth();

  const { data, error, mutate } = useSWR<BrandsResponse>(
    session ? '/api/brands' : null,
  );

  const createBrand = async (domain: string, defaultCountry?: string) => {
    if (!session) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    // Let the API determine the active organization
    const response = await post<BrandsResponse>('/api/brands', {
      domain,
      ...(defaultCountry && { defaultCountry }),
    });

    mutate();
    return response;
  };

  const updateBrand = async (brandId: string, data: Partial<Brand>) => {
    const response = await patch<BrandsResponse>('/api/brands', {
      brandId,
      ...data,
    });

    mutate();
    return response;
  };

  const deleteBrand = async (brandId: string) => {
    await del(`/api/brands?brandId=${brandId}`);
    mutate();
  };

  return {
    brands: data?.brands || [],
    isLoading: !error && !data && !!session, // Only loading if authenticated
    error,
    createBrand,
    updateBrand,
    deleteBrand,
    mutate,
  };
}

export type { Brand };
