'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

import { CompetitorManagementSheet } from '@/components/competitors/competitor-management-sheet';
import { useCompetitors } from '@/hooks/use-competitors';
import { BrandFilter } from '@/components/brands/brand-filter';
import { CompetitorVisibilityChart } from '@/components/competitors/competitor-visibility-chart';
import { CompetitorMetricsTable } from '@/components/competitors/competitor-metrics-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function CompetitorsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const { competitors, chartData, brandsToChart, error, isLoading } =
    useCompetitors(
      selectedBrand,
      true, // includeStats
    );

  // Sort accepted competitors and own brand by visibility score for the table
  const sortedCompetitors = competitors
    .filter((c: any) => c.status === 'ACCEPTED' || c.isOwnBrand)
    .sort(
      (a: any, b: any) => (b.visibilityScore || 0) - (a.visibilityScore || 0),
    );

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Competitors</h2>
            <p className="text-muted-foreground">
              Overview of competitors identified in the tracking results
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
          <div className="space-y-6">
            <Skeleton className="h-[350px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chart Section */}
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

            {/* Competitors Table Section */}
            <Card>
              <CardHeader>
                <CardTitle>All Competitors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] overflow-auto">
                  <CompetitorMetricsTable competitors={sortedCompetitors} />
                </div>
              </CardContent>
            </Card>
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
