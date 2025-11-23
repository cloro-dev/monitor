'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

import { CompetitorManagementSheet } from '@/components/competitors/competitor-management-sheet';
import { useCompetitors } from '@/hooks/use-competitors';
import { useBrands } from '@/hooks/use-brands';
import { BrandFilter } from '@/components/brands/brand-filter';
import { CompetitorVisibilityChart } from '@/components/competitors/competitor-visibility-chart';
import { Skeleton } from '@/components/ui/skeleton';

export default function CompetitorsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const {
    competitors,
    chartData,
    selectedBrandName,
    brandsToChart,
    error,
    isLoading,
  } = useCompetitors(
    selectedBrand,
    true, // includeStats
  );
  const { brands } = useBrands();

  // Check if there are any competitors with null status
  const hasNullStatusCompetitors =
    Array.isArray(competitors) &&
    competitors.some((competitor: any) => competitor.status === null);

  // Calculate metrics for the overview cards (only for the selected brand's competitors)
  const pendingCompetitors = Array.isArray(competitors)
    ? competitors.filter((c: any) => c.status === null).length
    : 0;

  return (
    <>
      <div className="space-y-6">
        {hasNullStatusCompetitors && (
          <Card className="border-orange-200 bg-orange-50 pb-3 pt-3 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200">
            <CardContent className="px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">Action Required</span>
                      {': You have '}
                      {pendingCompetitors}
                      {' competitor'}
                      {pendingCompetitors !== 1 ? 's' : ''}
                      {' that need to be reviewed.'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setSheetOpen(true)}
                  variant="default"
                  size="sm"
                >
                  Manage Competitors
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Competitors</h2>
            <p className="text-muted-foreground">
              Overview of competitors identified in the tracking results.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <BrandFilter value={selectedBrand} onChange={setSelectedBrand} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Manage Competitors
            </Button>
          </div>
        </div>

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
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-6">
            <Skeleton className="h-[350px] w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {!selectedBrand ? (
              <Card className="flex h-[350px] items-center justify-center border-dashed">
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Select a brand to view visibility trends
                  </p>
                </CardContent>
              </Card>
            ) : chartData.length === 0 ? (
              <Card className="flex h-[350px] items-center justify-center border-dashed">
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    No visibility data available for this brand yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <CompetitorVisibilityChart
                data={chartData}
                competitors={brandsToChart}
              />
            )}
          </div>
        )}
      </div>

      <CompetitorManagementSheet
        key={selectedBrand || 'sheet'}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialBrandId={selectedBrand}
      />
    </>
  );
}
