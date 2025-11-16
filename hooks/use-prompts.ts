"use client";

import useSWR, { mutate } from "swr";
import { useAuth } from "./use-auth";
import { post, put, del } from "@/lib/fetcher";

// Type definitions based on the API response
export interface Prompt {
  id: string;
  text: string;
  country: string;
  createdAt: string;
  updatedAt: string;
}

interface CreatePromptData {
  text: string;
  country: string;
}

interface UpdatePromptData {
  text: string;
  country: string;
}

/**
 * Hook to fetch user's prompts
 */
export function usePrompts() {
  const { isAuthenticated } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<Prompt[]>(
    isAuthenticated ? "/api/prompts" : null,
    {
      // Revalidate on focus to get the latest prompts
      revalidateOnFocus: true,
      // Cache for 2 minutes (prompts might change frequently)
      dedupingInterval: 2 * 60 * 1000,
      // Refresh every 5 minutes in background
      refreshInterval: 5 * 60 * 1000,
    }
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
    }
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
  const { mutate: globalMutate } = usePrompts();

  const createPrompt = async (data: CreatePromptData) => {
    try {
      const newPrompt = await post<Prompt>("/api/prompts", data);

      // Optimistically update the cache
      await globalMutate((currentPrompts: Prompt[] | undefined) => {
        if (!currentPrompts) return [newPrompt];
        return [newPrompt, ...currentPrompts];
      }, false); // Don't revalidate immediately

      // Then revalidate to ensure consistency
      await globalMutate();

      return newPrompt;
    } catch (error) {
      // Revert optimistic update on error
      await globalMutate();
      throw error;
    }
  };

  return { createPrompt };
}

/**
 * Hook to update an existing prompt
 */
export function useUpdatePrompt() {
  const { mutate: globalMutate } = usePrompts();

  const updatePrompt = async (id: string, data: UpdatePromptData) => {
    try {
      const updatedPrompt = await put<Prompt>(`/api/prompts/${id}`, data);

      // Update the cache with the new data
      await globalMutate((currentPrompts: Prompt[] | undefined) => {
        if (!currentPrompts) return currentPrompts;

        return currentPrompts.map((prompt) =>
          prompt.id === id ? updatedPrompt : prompt
        );
      }, false); // Don't revalidate, we already have the latest data

      return updatedPrompt;
    } catch (error) {
      // Revert on error by triggering a revalidation
      await globalMutate();
      throw error;
    }
  };

  return { updatePrompt };
}

/**
 * Hook to delete a prompt
 */
export function useDeletePrompt() {
  const { mutate: globalMutate } = usePrompts();

  const deletePrompt = async (id: string) => {
    try {
      // Optimistically remove the prompt from cache
      await globalMutate((currentPrompts: Prompt[] | undefined) => {
        if (!currentPrompts) return currentPrompts;
        return currentPrompts.filter((prompt) => prompt.id !== id);
      }, false);

      await del(`/api/prompts/${id}`);

      return true;
    } catch (error) {
      // Revert optimistic update on error
      await globalMutate();
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
        prompt.country.toLowerCase().includes(lowercaseQuery)
    );
  };

  const getRecentPrompts = (limit: number = 5) => {
    return prompts
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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