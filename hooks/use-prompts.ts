'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useAuth } from './use-auth';
import { post, put, del } from '@/lib/fetcher';

// Type definitions based on the API response
export interface Result {
  id: string;
  model: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  response: any;
  sentiment: number | null;
  position: number | null;
  competitors: any;
  createdAt: string;
}

export interface Prompt {
  id: string;
  text: string;
  country: string;
  status: 'ACTIVE' | 'SUGGESTED' | 'ARCHIVED';
  brandId: string;
  createdAt: string;
  updatedAt: string;
  brand?: {
    id: string;
    name: string | null;
    domain: string;
  };
  results?: Result[];
  visibilityScore?: number | null;
  averageSentiment?: number | null;
  averagePosition?: number | null;
}

interface CreatePromptData {
  text: string;
  country: string;
  brandId: string;
}

interface UpdatePromptData {
  text?: string;
  country?: string;
  brandId?: string;
  status?: 'ACTIVE' | 'SUGGESTED' | 'ARCHIVED';
}

/**
 * Hook to fetch user's prompts
 */
export function usePrompts(
  brandId?: string | null,
  status?: string | null,
  page?: number,
  limit?: number,
) {
  const { isAuthenticated } = useAuth();

  const getKey = () => {
    if (!isAuthenticated) return null;
    let key = '/api/prompts?';
    if (brandId) {
      key += `brandId=${brandId}&`;
    }
    if (status) {
      key += `status=${status}&`;
    }
    if (page) {
      key += `page=${page}&`;
    }
    if (limit) {
      key += `limit=${limit}&`;
    }
    return key;
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
        console.error('Error fetching prompts:', error);
        throw error;
      }
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 2 * 60 * 1000,
      refreshInterval: 5 * 60 * 1000,
      keepPreviousData: true,
    },
  );

  const prompts = data?.prompts || (Array.isArray(data) ? data : []);
  const pagination = data?.pagination;
  const counts = data?.counts;

  return {
    prompts: prompts as Prompt[],
    pagination,
    counts,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to get a single prompt by ID
 */
export function usePrompt(id: string | null) {
  const { isAuthenticated } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<Prompt>(
    isAuthenticated && id ? `/api/prompts/${id}` : null,
    {
      revalidateOnFocus: false, // Don't auto-refresh individual prompts
      dedupingInterval: 5 * 60 * 1000, // Cache for 5 minutes
    },
  );

  return {
    prompt: data,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to create a new prompt
 */
export function useCreatePrompt() {
  const createPrompt = async (data: CreatePromptData) => {
    try {
      const newPrompt = await post<Prompt>('/api/prompts', data);

      // Invalidate all prompt-related keys to refresh all views
      await globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/api/prompts'),
        undefined,
        { revalidate: true },
      );

      return newPrompt;
    } catch (error) {
      throw error;
    }
  };

  return { createPrompt };
}

/**
 * Hook to update an existing prompt
 */
export function useUpdatePrompt() {
  const updatePrompt = async (id: string, data: UpdatePromptData) => {
    try {
      const updatedPrompt = await put<Prompt>(`/api/prompts/${id}`, data);

      // Invalidate all prompt-related keys to refresh all views (lists, single prompt, etc.)
      await globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/api/prompts'),
        undefined,
        { revalidate: true },
      );

      return updatedPrompt;
    } catch (error) {
      throw error;
    }
  };

  return { updatePrompt };
}

/**
 * Hook to delete a prompt
 */
export function useDeletePrompt() {
  const deletePrompt = async (id: string) => {
    try {
      await del(`/api/prompts/${id}`);

      // Invalidate all prompt-related keys
      await globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/api/prompts'),
        undefined,
        { revalidate: true },
      );

      return true;
    } catch (error) {
      throw error;
    }
  };

  return { deletePrompt };
}

/**
 * Hook for prompt-related utilities
 */
export function usePromptUtils() {
  const { prompts } = usePrompts();

  const getPromptById = (id: string) => {
    return prompts.find((prompt) => prompt.id === id);
  };

  const getPromptsByCountry = (country: string) => {
    return prompts.filter((prompt) => prompt.country === country);
  };

  const getUniqueCountries = () => {
    const countries = prompts.map((prompt) => prompt.country);
    return Array.from(new Set(countries));
  };

  const searchPrompts = (query: string) => {
    if (!query.trim()) return prompts;

    const lowercaseQuery = query.toLowerCase();
    return prompts.filter(
      (prompt) =>
        prompt.text.toLowerCase().includes(lowercaseQuery) ||
        prompt.country.toLowerCase().includes(lowercaseQuery),
    );
  };

  const getRecentPrompts = (limit: number = 5) => {
    return prompts
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);
  };

  return {
    getPromptById,
    getPromptsByCountry,
    getUniqueCountries,
    searchPrompts,
    getRecentPrompts,
  };
}
