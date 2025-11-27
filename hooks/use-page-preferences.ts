import { useLocalStorage } from './use-local-storage';
import { useMemo, useCallback } from 'react';
import type {
  StoredPreferences,
  PageKey,
  PagePreferenceType,
  PagePreferenceKeys,
} from '../lib/preference-types';
import { defaultPagePreferences } from '../lib/preference-defaults';

const STORAGE_KEY = 'cloro-dashboard-preferences';

// Stable deserialize function to prevent infinite re-renders
const createDeserializeFunction = () => (str: string) => {
  try {
    const parsed = JSON.parse(str);
    // Handle migration or version upgrades
    if (!parsed.version || parsed.version !== '1.0') {
      console.warn('Preference schema version mismatch, using defaults');
      return {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        data: defaultPagePreferences,
      };
    }
    return parsed;
  } catch (e) {
    console.warn('Failed to parse preferences, using defaults', e);
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      data: defaultPagePreferences,
    };
  }
};

/**
 * Hook for managing page-specific preferences
 *
 * @param page - The page key (e.g., 'sources', 'prompts', 'competitors')
 * @param defaultValues - Default values for this specific page
 * @returns Object with preferences, update functions, and state
 */
export function usePagePreferences<T extends PageKey>(
  page: T,
  defaultValues: PagePreferenceType<T>,
): {
  preferences: PagePreferenceType<T>;
  updatePreference: <K extends PagePreferenceKeys<T>>(
    key: K,
    value: PagePreferenceType<T>[K],
  ) => void;
  updateMultiplePreferences: (updates: Partial<PagePreferenceType<T>>) => void;
  setPreferences: (preferences: PagePreferenceType<T>) => void;
  resetPreferences: () => void;
  resetToDefault: (key?: PagePreferenceKeys<T>) => void;
  isLoading: boolean;
  error: string | null;
} {
  // Stable deserialize function to prevent infinite re-renders
  const stableDeserialize = useMemo(() => createDeserializeFunction(), []);

  // Stable initial default value to prevent infinite loops
  // Note: lastUpdated will be set when data is first loaded from localStorage or when first saved
  const stableInitialValue = useMemo(
    () => ({
      version: '1.0' as const,
      lastUpdated: '',
      data: defaultPagePreferences,
    }),
    [], // No dependencies needed since defaultPagePreferences is a constant
  );

  // Get all preferences from localStorage
  const [
    allPreferences,
    setAllPreferences,
    resetAllPreferences,
    isLoading,
    error,
  ] = useLocalStorage<StoredPreferences>(STORAGE_KEY, stableInitialValue, {
    serialize: JSON.stringify,
    deserialize: stableDeserialize,
    debounceMs: 300,
  });

  // Get preferences for the specific page - use stable reference
  const currentPagePreferences = useMemo(() => {
    return allPreferences.data[page] ?? defaultValues;
  }, [allPreferences.data, page, defaultValues]);

  // Update a single preference for the current page
  const updatePreference = useCallback(
    <K extends PagePreferenceKeys<T>>(
      key: K,
      value: PagePreferenceType<T>[K],
    ) => {
      setAllPreferences((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        data: {
          ...prev.data,
          [page]: {
            ...prev.data[page],
            [key]: value,
          },
        },
      }));
    },
    [setAllPreferences, page],
  );

  // Update multiple preferences at once
  const updateMultiplePreferences = useCallback(
    (updates: Partial<PagePreferenceType<T>>) => {
      setAllPreferences((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        data: {
          ...prev.data,
          [page]: {
            ...prev.data[page],
            ...updates,
          },
        },
      }));
    },
    [setAllPreferences, page],
  );

  // Set all preferences for the current page
  const setPreferences = useCallback(
    (preferences: PagePreferenceType<T>) => {
      setAllPreferences((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        data: {
          ...prev.data,
          [page]: preferences,
        },
      }));
    },
    [setAllPreferences, page],
  );

  // Reset all preferences for current page to provided defaults
  const resetPreferences = useCallback(() => {
    setAllPreferences((prev) => ({
      ...prev,
      lastUpdated: new Date().toISOString(),
      data: {
        ...prev.data,
        [page]: defaultValues,
      },
    }));
  }, [setAllPreferences, page, defaultValues]);

  // Reset a specific preference or all preferences to global defaults
  const resetToDefault = useCallback(
    (key?: PagePreferenceKeys<T>) => {
      if (key) {
        // Reset specific preference to its global default
        const globalDefaults = defaultPagePreferences[page];
        if (globalDefaults && key in globalDefaults) {
          updatePreference(key, globalDefaults[key]);
        }
      } else {
        // Reset all preferences for this page
        resetPreferences();
      }
    },
    [updatePreference, resetPreferences, page],
  );

  return {
    preferences: currentPagePreferences,
    updatePreference,
    updateMultiplePreferences,
    setPreferences,
    resetPreferences,
    resetToDefault,
    isLoading,
    error,
  };
}

/**
 * Hook for accessing all page preferences (utility hook)
 */
export function useAllPagePreferences() {
  return useLocalStorage<StoredPreferences>(STORAGE_KEY, {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    data: defaultPagePreferences,
  });
}

/**
 * Hook for clearing all preferences
 */
export function useClearAllPreferences() {
  const [, , resetAllPreferences] = useAllPagePreferences();

  const clearAll = () => {
    resetAllPreferences();
  };

  return { clearAll };
}
