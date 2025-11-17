'use client';

import useSWR, { mutate } from 'swr';
import { useAuth } from './use-auth';
import { post, patch, del } from '@/lib/fetcher';

// Type definitions based on the API response
export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface Member {
  id: string;
  userId: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'member';
  user: User;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  metadata?: any;
  members: Member[];
  createdAt: string;
  updatedAt: string;
}

interface OrganizationsResponse {
  organizations: Organization[];
}

interface OrganizationResponse {
  organization: Organization;
}

interface CreateOrganizationData {
  name: string;
  slug: string;
  logo?: string;
  metadata?: any;
}

interface UpdateOrganizationData {
  organizationId: string;
  name?: string;
  slug?: string;
  logo?: string;
}

/**
 * Hook to fetch user's organizations
 */
export function useOrganizations() {
  const { isAuthenticated } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<OrganizationsResponse>(
    isAuthenticated ? '/api/organizations' : null,
    {
      // Don't refetch on focus for organizations (changes are rare)
      revalidateOnFocus: false,
      // Cache for 5 minutes
      dedupingInterval: 5 * 60 * 1000,
    },
  );

  return {
    organizations: data?.organizations || [],
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to get the active organization based on session
 */
export function useActiveOrganization() {
  const { session } = useAuth();
  const { organizations } = useOrganizations();

  const activeOrganization =
    organizations.find((org) => org.id === session?.activeOrganizationId) ||
    organizations[0]; // Fallback to first organization

  return {
    activeOrganization,
    hasOrganizations: organizations.length > 0,
  };
}

/**
 * Hook to check if a slug is available
 */
export function useSlugAvailability(slug: string) {
  const { data, error, isLoading } = useSWR<{ exists: boolean }>(
    slug && slug.length > 2
      ? `/api/organizations/check-slug?slug=${slug}`
      : null,
    {
      // Don't cache slug checks for too long
      dedupingInterval: 30 * 1000,
      revalidateOnFocus: false,
    },
  );

  return {
    isAvailable: data ? !data.exists : true, // Default to true if not checked yet
    isChecking: isLoading,
    error,
  };
}

/**
 * Hook to create a new organization
 */
export function useCreateOrganization() {
  const { mutate: globalMutate } = useOrganizations();

  const createOrganization = async (data: CreateOrganizationData) => {
    try {
      const response = await post<OrganizationResponse>(
        '/api/organizations',
        data,
      );

      // Invalidate the organizations cache to trigger a refetch
      await globalMutate();

      return response;
    } catch (error) {
      throw error;
    }
  };

  return { createOrganization };
}

/**
 * Hook to update an existing organization
 */
export function useUpdateOrganization() {
  const { mutate: globalMutate } = useOrganizations();

  const updateOrganization = async (data: UpdateOrganizationData) => {
    try {
      const response = await patch<OrganizationResponse>(
        '/api/organizations',
        data,
      );

      // Update the cache with the new data
      await globalMutate((currentData: OrganizationsResponse | undefined) => {
        if (!currentData) return currentData;

        return {
          organizations: currentData.organizations.map((org) =>
            org.id === data.organizationId
              ? { ...org, ...response.organization }
              : org,
          ),
        };
      }, false); // Don't revalidate, we already have the latest data

      return response;
    } catch (error) {
      throw error;
    }
  };

  return { updateOrganization };
}

/**
 * Hook for organization-related utilities
 */
export function useOrganizationUtils() {
  const { organizations } = useOrganizations();
  const { session } = useAuth();

  const getOrganizationById = (id: string) => {
    return organizations.find((org) => org.id === id);
  };

  const getOrganizationBySlug = (slug: string) => {
    return organizations.find((org) => org.slug === slug);
  };

  const getUserRole = (organizationId: string) => {
    const org = getOrganizationById(organizationId);

    if (!org || !session?.user) return null;

    const member = org.members.find((m) => m.user.id === session.user.id);
    return member?.role || null;
  };

  const canManageOrganization = (organizationId: string) => {
    const role = getUserRole(organizationId);
    return role === 'owner' || role === 'admin';
  };

  return {
    getOrganizationById,
    getOrganizationBySlug,
    getUserRole,
    canManageOrganization,
  };
}
