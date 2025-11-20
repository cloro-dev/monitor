'use client';

import { useBrands } from '@/hooks/use-brands';
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
}

export function BrandFilter({ value, onChange, className }: BrandFilterProps) {
  const { brands } = useBrands();

  return (
    <Select
      value={value || 'all'}
      onValueChange={(val) => onChange(val === 'all' ? null : val)}
    >
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
