'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { LoadingBoundary } from '@/components/ui/loading-boundary';

import { CompetitorManagementSheet } from '@/components/competitors/competitor-management-sheet';
import { useCompetitors } from '@/hooks/use-competitors';
import { BrandFilter } from '@/components/brands/brand-filter';
import { CompetitorVisibilityChart } from '@/components/competitors/competitor-visibility-chart';
import { CompetitorMetricsTable } from '@/components/competitors/competitor-metrics-table';
import { usePagePreferences } from '@/hooks/use-page-preferences';
import { defaultCompetitorsPreferences } from '@/lib/preference-defaults';

export default function CompetitorsPage() {
  // Preference management
  const { preferences, updatePreference } = usePagePreferences(
    'competitors',
    defaultCompetitorsPreferences,
  );

  // Local state for sheet (not persisted)
  const [sheetOpen, setSheetOpen] = useState(false);

  const { competitors, chartData, brandsToChart, error, isLoading } =
    useCompetitors(
      preferences.brandId,
      preferences.brandId ? true : false, // only includeStats when brandId exists
    );

  // Sort accepted competitors and own brand by visibility score for the table
  const sortedCompetitors = competitors
    .filter((c: any) => c.status === 'ACCEPTED' || c.isOwnBrand)
    .sort(
      (a: any, b: any) => (b.visibilityScore || 0) - (a.visibilityScore || 0),
    );

  return (
    <LoadingBoundary isLoading={isLoading}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Competitors</h2>
            <p className="text-muted-foreground">
              Overview of competitors identified in the tracking results
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <BrandFilter
              value={preferences.brandId}
              onChange={(val) => updatePreference('brandId', val)}
            />
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

        <div className="space-y-6">
          {/* Chart Section */}
          {!preferences.brandId ? (
            <Card className="flex h-[350px] items-center justify-center border-dashed">
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Select a brand to view visibility trends
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Brand selection is required to view competitor data
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
          {!preferences.brandId ? (
            <Card className="flex h-[400px] items-center justify-center border-dashed">
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Select a brand to view competitors
                </p>
              </CardContent>
            </Card>
          ) : (
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
          )}
        </div>
      </div>

      <CompetitorManagementSheet
        key={preferences.brandId || 'sheet'}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialBrandId={preferences.brandId}
      />
    </LoadingBoundary>
  );
}
