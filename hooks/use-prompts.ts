'use client';

import useSWR from 'swr';
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
export function usePrompts(brandId?: string | null, status?: string | null) {
  const { isAuthenticated } = useAuth();

  const getKey = () => {
    if (!isAuthenticated) return null;
    let key = '/api/prompts?';
    if (brandId) {
      key += `brandId=${brandId}&`;
    }
    if (status) {
      key += `status=${status}`;
    }
    return key;
  };

  const { data, error, isLoading, mutate } = useSWR<Prompt[]>(
    getKey,
    async (url: string) => {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jsonData = await response.json();

        // Handle different response formats
        if (Array.isArray(jsonData)) {
          return jsonData;
        } else if (jsonData && Array.isArray(jsonData.prompts)) {
          return jsonData.prompts;
        } else {
          console.error('Unexpected API response format:', jsonData);
          return [];
        }
      } catch (error) {
        console.error('Error fetching prompts:', error);
        throw error;
      }
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 2 * 60 * 1000,
      refreshInterval: 5 * 60 * 1000,
    },
  );

  return {
    prompts: data || [],
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
  // We need to mutate the main list that fetches all prompts
  const { mutate } = useSWR('/api/prompts?status=ALL');

  const createPrompt = async (data: CreatePromptData) => {
    try {
      const newPrompt = await post<Prompt>('/api/prompts', data);

      // Optimistically update the cache
      await mutate((currentPrompts: Prompt[] | undefined) => {
        if (!currentPrompts) return [newPrompt];
        return [newPrompt, ...currentPrompts];
      }, false);

      // Then revalidate to ensure consistency
      await mutate();

      return newPrompt;
    } catch (error) {
      // Revert optimistic update on error
      await mutate();
      throw error;
    }
  };

  return { createPrompt };
}

/**
 * Hook to update an existing prompt
 */
export function useUpdatePrompt() {
  const { mutate } = useSWR('/api/prompts?status=ALL');

  const updatePrompt = async (id: string, data: UpdatePromptData) => {
    try {
      const updatedPrompt = await put<Prompt>(`/api/prompts/${id}`, data);

      // Update the cache with the new data
      await mutate((currentPrompts: Prompt[] | undefined) => {
        if (!currentPrompts) return currentPrompts;

        return currentPrompts.map((prompt) =>
          prompt.id === id ? { ...prompt, ...updatedPrompt } : prompt,
        );
      }, false);

      // Force revalidation to ensure consistency
      await mutate();

      return updatedPrompt;
    } catch (error) {
      // Revert on error by triggering a revalidation
      await mutate();
      throw error;
    }
  };

  return { updatePrompt };
}

/**
 * Hook to delete a prompt
 */
export function useDeletePrompt() {
  const { mutate } = useSWR('/api/prompts?status=ALL');

  const deletePrompt = async (id: string) => {
    try {
      // Optimistically remove the prompt from cache
      // Note: For "archive", we might want to update instead of remove,
      // but since this hook is generic, removing/invalidating is safer for now
      // or we rely on revalidation.
      await mutate((currentPrompts: Prompt[] | undefined) => {
        if (!currentPrompts) return currentPrompts;
        return currentPrompts.filter((prompt) => prompt.id !== id);
      }, false);

      await del(`/api/prompts/${id}`);

      // Force revalidation
      await mutate();

      return true;
    } catch (error) {
      // Revert optimistic update on error
      await mutate();
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
