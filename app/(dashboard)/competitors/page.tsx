'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

import { CompetitorManagementSheet } from '@/components/competitors/competitor-management-sheet';
import { useCompetitors } from '@/hooks/use-competitors';
import { useBrands } from '@/hooks/use-brands';

export default function CompetitorsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { competitors, error } = useCompetitors();
  const { brands } = useBrands();

  // Check if there are any competitors with null status
  const hasNullStatusCompetitors =
    Array.isArray(competitors) &&
    competitors.some((competitor: any) => competitor.status === null);

  // Calculate metrics
  const totalCompetitors = Array.isArray(competitors) ? competitors.length : 0;
  const acceptedCompetitors = Array.isArray(competitors)
    ? competitors.filter((c: any) => c.status === 'ACCEPTED').length
    : 0;
  const rejectedCompetitors = Array.isArray(competitors)
    ? competitors.filter((c: any) => c.status === 'REJECTED').length
    : 0;
  const pendingCompetitors = Array.isArray(competitors)
    ? competitors.filter((c: any) => c.status === null).length
    : 0;

  return (
    <>
      {hasNullStatusCompetitors && (
        <Card className="mb-6 border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200">
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Competitors</CardTitle>
              <CardDescription>
                Overview of competitors identified in the tracking results.
              </CardDescription>
            </div>
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{totalCompetitors}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {acceptedCompetitors}
                </div>
                <div className="text-sm text-muted-foreground">Accepted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {rejectedCompetitors}
                </div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {pendingCompetitors}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CompetitorManagementSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
