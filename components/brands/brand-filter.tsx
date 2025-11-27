'use client';

import { useBrands } from '@/hooks/use-brands';
import { usePagePreferences } from '@/hooks/use-page-preferences';
import type { PagePreferenceType } from '@/lib/preference-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BrandFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
  /**
   * Optional persistence key to automatically save brand selection to preferences.
   * Format: 'pageName.propertyName' (e.g., 'sources.brandId')
   * When provided, the component will use usePagePreferences internally.
   */
  persistKey?: `${string}.${string}`;
}

function usePersistedValue(
  persistKey: string | undefined,
  propValue: string | null,
): {
  currentValue: string | null;
  updatePersistedValue: (value: string | null) => void;
} {
  // Always call hooks unconditionally
  const [pageKey, preferenceKey] = persistKey?.split('.') || ['', ''];

  // Always initialize preferences hook, but use empty defaults when no persistKey
  const prefResult = usePagePreferences(pageKey as any, {} as any);

  const preferences = prefResult.preferences;
  const updatePreference = prefResult.updatePreference as any;

  // Determine current value
  const currentValue = persistKey
    ? (preferences[preferenceKey as keyof PagePreferenceType<any>] as
        | string
        | null) || propValue
    : propValue;

  // Update function
  const updatePersistedValue = (value: string | null) => {
    if (persistKey && updatePreference) {
      updatePreference(preferenceKey, value);
    }
  };

  return { currentValue, updatePersistedValue };
}

export function BrandFilter({
  value,
  onChange,
  className,
  persistKey,
}: BrandFilterProps) {
  const { brands } = useBrands();

  const { currentValue, updatePersistedValue } = usePersistedValue(
    persistKey,
    value,
  );

  const handleValueChange = (val: string) => {
    const newValue = val === 'all' ? null : val;

    // Update persisted value if persistKey is provided
    updatePersistedValue(newValue);

    // Always call the original onChange for backward compatibility
    onChange(newValue);
  };

  return (
    <Select value={currentValue || 'all'} onValueChange={handleValueChange}>
      <SelectTrigger className={className || 'w-[180px]'}>
        <SelectValue placeholder="Filter by brand" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All brands</SelectItem>
        {brands?.map((brand) => (
          <SelectItem key={brand.id} value={brand.id}>
            {brand.name || brand.domain}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
