import useSWR from 'swr';
import { post, patch, del } from '@/lib/fetcher';

interface Brand {
  id: string;
  domain: string;
  brandName: string | null;
  faviconUrl: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

interface BrandsResponse {
  brands: Brand[];
}

export function useBrands() {
  const { data, error, mutate } = useSWR<BrandsResponse>('/api/brands');

  const createBrand = async (domain: string) => {
    // Get organization ID from the current brands or fetch it
    const organizationId =
      data?.brands?.[0]?.organizationId || (await getCurrentOrganizationId());

    if (!organizationId) {
      throw new Error('No organization found');
    }

    const response = await post<BrandsResponse>('/api/brands', {
      domain,
      organizationId,
    });

    mutate(response);
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
    isLoading: !error && !data,
    error,
    createBrand,
    updateBrand,
    deleteBrand,
    mutate,
  };
}

// Helper function to get current organization ID
async function getCurrentOrganizationId(): Promise<string | null> {
  try {
    const response = await fetch('/api/organizations');
    const data = await response.json();

    if (data.organizations?.length > 0) {
      // Return the first organization's ID for now
      // In a real app, you might want to use the active organization
      return data.organizations[0].id;
    }

    return null;
  } catch (error) {
    console.error('Error fetching organization:', error);
    return null;
  }
}

export type { Brand };
