'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePagePreferences } from '@/hooks/use-page-preferences';
import type { PagePreferenceType } from '@/lib/preference-types';

export interface DateRangeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  /**
   * Optional persistence key to automatically save time range selection to preferences.
   * Format: 'pageName.propertyName' (e.g., 'sources.timeRange')
   * When provided, the component will use usePagePreferences internally.
   */
  persistKey?: `${string}.${string}`;
}

function usePersistedDateRange(
  persistKey: string | undefined,
  propValue: string,
): {
  currentValue: string;
  updatePersistedValue: (value: string) => void;
} {
  // Always call hooks unconditionally
  const [pageKey, preferenceKey] = persistKey?.split('.') || ['', ''];

  // Always initialize preferences hook, but use empty defaults when no persistKey
  const prefResult = usePagePreferences(pageKey as any, {} as any);

  const preferences = prefResult.preferences;
  const updatePreference = prefResult.updatePreference as any;

  // Determine current value
  const currentValue = persistKey
    ? (preferences[preferenceKey as keyof PagePreferenceType<any>] as string) ||
      propValue
    : propValue;

  // Update function
  const updatePersistedValue = (value: string) => {
    if (persistKey && updatePreference) {
      updatePreference(preferenceKey, value);
    }
  };

  return { currentValue, updatePersistedValue };
}

export function DateRangeSelect({
  value,
  onValueChange,
  className,
  persistKey,
}: DateRangeSelectProps) {
  const { currentValue, updatePersistedValue } = usePersistedDateRange(
    persistKey,
    value,
  );

  const handleValueChange = (val: string) => {
    // Update persisted value if persistKey is provided
    updatePersistedValue(val);

    // Always call the original onValueChange for backward compatibility
    onValueChange(val);
  };

  return (
    <Select value={currentValue} onValueChange={handleValueChange}>
      <SelectTrigger className={className || 'w-[160px]'}>
        <SelectValue placeholder="Select time range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">Last 7 days</SelectItem>
        <SelectItem value="30d">Last 30 days</SelectItem>
        <SelectItem value="90d">Last 90 days</SelectItem>
      </SelectContent>
    </Select>
  );
}
