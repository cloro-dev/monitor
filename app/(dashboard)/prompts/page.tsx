'use client';

import { useState, useMemo, useCallback } from 'react';
import { PromptsTable } from '@/components/prompts/prompts-table';
import { AddPromptButton } from '@/components/prompts/prompt-dialog';
import { usePrompts } from '@/hooks/use-prompts';
import { useBrands } from '@/hooks/use-brands';
import { useActiveOrganization } from '@/hooks/use-organizations';
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
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default function PromptsPage() {
  // Fetch all prompts including archived ones to calculate counts
  const { prompts, error } = usePrompts(null, 'ALL');
  const { brands } = useBrands();
  const { activeOrganization } = useActiveOrganization();
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');

  const filterPrompts = useCallback(
    (status: string) => {
      let filtered = Array.isArray(prompts) ? prompts : [];

      // Filter by brand if selected
      if (selectedBrand) {
        filtered = filtered.filter(
          (prompt) => prompt.brand?.id === selectedBrand,
        );
      }

      // Filter by status
      return filtered.filter((prompt) => {
        if (status === 'active') return prompt.status === 'ACTIVE';
        if (status === 'suggested') return prompt.status === 'SUGGESTED';
        if (status === 'archived') return prompt.status === 'ARCHIVED';
        return false;
      });
    },
    [prompts, selectedBrand],
  );

  const activePrompts = useMemo(() => filterPrompts('active'), [filterPrompts]);
  const suggestedPrompts = useMemo(
    () => filterPrompts('suggested'),
    [filterPrompts],
  );
  const archivedPrompts = useMemo(
    () => filterPrompts('archived'),
    [filterPrompts],
  );

  // Check if AI models are enabled
  const enabledModels = (activeOrganization?.aiModels as string[]) || [];
  const hasAIModelsEnabled = enabledModels.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prompts</CardTitle>
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
              {!hasAIModelsEnabled ? (
                <div className="group relative">
                  <AddPromptButton disabled />
                  <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
                    <div className="z-10 w-48 rounded bg-gray-900 px-3 py-2 text-xs text-white">
                      Enable AI models in Settings to create prompts
                    </div>
                    <div className="absolute bottom-0 right-2 h-2 w-2 rotate-45 transform bg-gray-900"></div>
                  </div>
                </div>
              ) : (
                <AddPromptButton />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!hasAIModelsEnabled ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <p className="mb-2 text-muted-foreground">
                  No AI models enabled
                </p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Enable at least one AI model in Settings {'>'} AI Models to
                  create and track prompts.
                </p>
                <Button variant="outline" asChild>
                  <a href="/settings">Go to Settings</a>
                </Button>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <p className="mb-2 text-destructive">Failed to load prompts</p>
                <p className="text-sm text-muted-foreground">
                  {error.message || 'Please try again later'}
                </p>
              </div>
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 lg:w-[300px]">
                <TabsTrigger value="active" className="items-end px-4">
                  Active
                  <span className="rounded-full bg-muted px-1 py-0.5 text-xs">
                    {activePrompts.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="suggested" className="items-end px-4">
                  Suggested
                  <span className="rounded-full bg-muted px-1 py-0.5 text-xs">
                    {suggestedPrompts.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="archived" className="items-end px-4">
                  Archived
                  <span className="rounded-full bg-muted px-1 py-0.5 text-xs">
                    {archivedPrompts.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-4">
                <PromptsTable data={activePrompts} />
              </TabsContent>

              <TabsContent value="suggested" className="mt-4">
                <PromptsTable
                  data={suggestedPrompts}
                  showStatusActions={true}
                />
              </TabsContent>

              <TabsContent value="archived" className="mt-4">
                <PromptsTable data={archivedPrompts} showStatusActions={true} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
