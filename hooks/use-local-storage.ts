import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface UseLocalStorageOptions<T> {
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  debounceMs?: number;
}

/**
 * Core localStorage hook with SSR safety and error handling
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: UseLocalStorageOptions<T> = {},
): [
  T,
  (value: T | ((prev: T) => T)) => void,
  () => void,
  boolean,
  string | null,
] {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    debounceMs = 300,
  } = options;

  // Memoize default value to prevent effect re-running
  const stableDefaultValue = useMemo(() => defaultValue, [defaultValue]);

  // State to track our value
  const [storedValue, setStoredValue] = useState<T>(stableDefaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track timeout to prevent memory leaks
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced write function
  const debouncedWrite = useCallback(
    (value: T) => {
      try {
        if (typeof window !== 'undefined') {
          const serializedValue = serialize(value);
          window.localStorage.setItem(key, serializedValue);
          setError(null);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to save to localStorage';
        setError(errorMessage);
        console.warn(`localStorage error for key "${key}":`, errorMessage);
      }
    },
    [key, serialize],
  );

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        // Save state
        setStoredValue(valueToStore);

        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Save to localStorage with debounce
        if (debounceMs > 0) {
          timeoutRef.current = setTimeout(() => {
            debouncedWrite(valueToStore);
            timeoutRef.current = null;
          }, debounceMs);
        } else {
          debouncedWrite(valueToStore);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to set value';
        setError(errorMessage);
        console.warn(
          `localStorage setValue error for key "${key}":`,
          errorMessage,
        );
      }
    },
    [storedValue, debouncedWrite, debounceMs, key],
  );

  // Reset to default value
  const resetValue = useCallback(() => {
    setStoredValue(stableDefaultValue);
    debouncedWrite(stableDefaultValue);
    setError(null);
  }, [stableDefaultValue, debouncedWrite]);

  // Load from localStorage on mount or when key changes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    try {
      if (typeof window !== 'undefined') {
        // Get from local storage by key
        const item = window.localStorage.getItem(key);

        // Parse stored json or if none return initialValue
        if (item) {
          try {
            const parsedValue = deserialize(item);
            setStoredValue(parsedValue);
            setError(null);
          } catch (parseError) {
            console.warn(
              `Failed to parse localStorage value for key "${key}", using default:`,
              parseError,
            );
            setStoredValue(stableDefaultValue);
            // Clear corrupted data
            window.localStorage.removeItem(key);
          }
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load from localStorage';
      setError(errorMessage);
      console.warn(`localStorage read error for key "${key}":`, errorMessage);
    } finally {
      // Set loading to false after a small delay to prevent flicker
      timeoutId = setTimeout(() => setIsLoading(false), 50);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [key, deserialize, stableDefaultValue]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Listen for changes to localStorage from other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = deserialize(e.newValue);
          setStoredValue(newValue);
          setError(null);
        } catch (err) {
          console.warn(`Failed to parse storage change for key "${key}":`, err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserialize]);

  return [storedValue, setValue, resetValue, isLoading, error];
}
