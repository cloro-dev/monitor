'use client';

import { useState, useMemo } from 'react';
import { PromptsTable } from '@/components/prompts/prompts-table';
import { AddPromptButton } from '@/components/prompts/prompt-dialog';
import { usePrompts, useBulkUpdatePrompts } from '@/hooks/use-prompts';
import { useActiveOrganization } from '@/hooks/use-organizations';
import { BrandFilter } from '@/components/brands/brand-filter';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default function PromptsPage() {
  const { activeOrganization } = useActiveOrganization();
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const { bulkUpdatePrompts } = useBulkUpdatePrompts();
  const [isAcceptingAll, setIsAcceptingAll] = useState(false);

  // Map UI tab to API status
  const apiStatus = useMemo(() => {
    if (activeTab === 'active') return 'ACTIVE';
    if (activeTab === 'suggested') return 'SUGGESTED';
    if (activeTab === 'archived') return 'ARCHIVED';
    return 'ACTIVE';
  }, [activeTab]);

  // Fetch paginated prompts for the current status
  const { prompts, pagination, counts, error } = usePrompts(
    selectedBrand,
    apiStatus,
    currentPage,
    itemsPerPage,
  );

  const handleAcceptAll = async () => {
    if (!prompts.length) return;
    setIsAcceptingAll(true);
    try {
      const ids = prompts.map((p) => p.id);
      await bulkUpdatePrompts(ids, 'ACTIVE');
      toast.success(`Accepted ${ids.length} prompts`);
    } catch (error) {
      toast.error('Failed to accept prompts');
    } finally {
      setIsAcceptingAll(false);
    }
  };

  // Check if AI models are enabled
  const enabledModels = (activeOrganization?.aiModels as string[]) || [];
  const hasAIModelsEnabled = enabledModels.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prompts</h2>
          <p className="text-muted-foreground">
            Create and manage your prompt templates
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <BrandFilter value={selectedBrand} onChange={setSelectedBrand} />
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

      {!hasAIModelsEnabled ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <p className="mb-2 text-muted-foreground">No AI models enabled</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Enable at least one AI model in Settings {'>'} AI Models to create
              and track prompts.
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
          onValueChange={(val) => {
            setActiveTab(val);
            setCurrentPage(1);
          }}
          className="w-full"
        >
          <div className="mb-4 flex items-center justify-between">
            <TabsList className="grid w-full grid-cols-3 lg:w-[300px]">
              <TabsTrigger value="active" className="items-end px-4">
                Active
                <span className="rounded-full bg-muted/50 px-1 py-0.5 text-xs dark:bg-border/50 dark:text-foreground/80">
                  {counts?.ACTIVE || 0}
                </span>
              </TabsTrigger>
              <TabsTrigger value="suggested" className="items-end px-4">
                Suggested
                <span className="rounded-full bg-muted/50 px-1 py-0.5 text-xs dark:bg-border/50 dark:text-foreground/80">
                  {counts?.SUGGESTED || 0}
                </span>
              </TabsTrigger>
              <TabsTrigger value="archived" className="items-end px-4">
                Archived
                <span className="rounded-full bg-muted/50 px-1 py-0.5 text-xs dark:bg-border/50 dark:text-foreground/80">
                  {counts?.ARCHIVED || 0}
                </span>
              </TabsTrigger>
            </TabsList>
            {activeTab === 'suggested' && prompts.length > 0 && (
              <Button
                onClick={handleAcceptAll}
                disabled={isAcceptingAll}
                size="sm"
                className="ml-auto"
              >
                {isAcceptingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Accept All
              </Button>
            )}
          </div>

          <TabsContent value="active" className="mt-4">
            <PromptsTable data={prompts} />
            {pagination && pagination.totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </TabsContent>

          <TabsContent value="suggested" className="mt-4">
            <PromptsTable data={prompts} showStatusActions={true} />
            {pagination && pagination.totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </TabsContent>

          <TabsContent value="archived" className="mt-4">
            <PromptsTable data={prompts} showStatusActions={true} />
            {pagination && pagination.totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
