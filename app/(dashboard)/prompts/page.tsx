'use client';

import { useState, useMemo } from 'react';
import { PromptsTable } from '@/components/prompts/prompts-table';
import { AddPromptButton } from '@/components/prompts/prompt-dialog';
import { usePrompts } from '@/hooks/use-prompts';
import { useBrands } from '@/hooks/use-brands';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default function PromptsPage() {
  const { prompts, error } = usePrompts();
  const { brands } = useBrands();
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const filteredPrompts = useMemo(() => {
    if (!selectedBrand) {
      return prompts;
    }
    return prompts?.filter((prompt) => prompt.brand?.id === selectedBrand);
  }, [prompts, selectedBrand]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Prompts</CardTitle>
              <CardDescription>
                Create and manage your prompt templates
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
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
              <AddPromptButton />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <p className="mb-2 text-destructive">Failed to load prompts</p>
                <p className="text-sm text-muted-foreground">
                  {error.message || 'Please try again later'}
                </p>
              </div>
            </div>
          ) : (
            <PromptsTable data={filteredPrompts} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
