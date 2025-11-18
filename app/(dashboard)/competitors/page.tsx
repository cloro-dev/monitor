'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { CompetitorsTable } from '@/components/competitors/competitors-table';
import { useCompetitors } from '@/hooks/use-competitors';
import { useBrands } from '@/hooks/use-brands';

export default function CompetitorsPage() {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const { competitors, error } = useCompetitors(selectedBrand);
  const { brands } = useBrands();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Competitors</CardTitle>
            <CardDescription>
              A list of competitors identified in the tracking results.
            </CardDescription>
          </div>
          <Select
            onValueChange={(value) =>
              setSelectedBrand(value === 'all' ? null : value)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands?.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="mb-2 text-destructive">
                Failed to load competitors
              </p>
              <p className="text-sm text-muted-foreground">
                {error.message || 'Please try again later'}
              </p>
            </div>
          </div>
        ) : (
          <CompetitorsTable data={competitors as any[]} />
        )}
      </CardContent>
    </Card>
  );
}
