'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCompetitors,
  Competitor,
  CompetitorsApiResponse,
} from '@/hooks/use-competitors';
import { useBrands } from '@/hooks/use-brands';
import { Check, X, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface CompetitorManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBrandId?: string | null;
}

export function CompetitorManagementSheet({
  open,
  onOpenChange,
  initialBrandId,
}: CompetitorManagementSheetProps) {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(
    initialBrandId || null,
  );
  const { competitors, isLoading, mutate, error } =
    useCompetitors(selectedBrand);
  const { brands } = useBrands();

  const handleUpdateStatus = async (
    id: string,
    status: 'ACCEPTED' | 'REJECTED' | null,
  ) => {
    // Optimistic UI update
    mutate(
      (currentData: Competitor[] | CompetitorsApiResponse | undefined) => {
        if (!currentData) return undefined;

        if (Array.isArray(currentData)) {
          // Handle array of Competitor (when includeStats is false)
          return currentData.map((c) => (c.id === id ? { ...c, status } : c));
        } else if (currentData && currentData.competitors) {
          // Handle CompetitorsApiResponse object (when includeStats is true)
          const updatedCompetitors = currentData.competitors.map((c) =>
            c.id === id ? { ...c, status } : c,
          );
          return { ...currentData, competitors: updatedCompetitors };
        }
        return currentData; // Fallback, return original data if neither matched
      },
      { revalidate: false },
    );

    // Send the update to the API
    await fetch('/api/competitors', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, status }),
    });

    // Trigger a revalidation to ensure data is in sync with the server
    mutate();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-hidden sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Manage Competitors</SheetTitle>
          <SheetDescription>
            Accept or reject competitors that have been identified in the
            tracking results.
          </SheetDescription>
        </SheetHeader>

        <div className="max-h-[calc(100vh-10rem)] flex-1 overflow-auto px-4">
          <div className="mb-2 flex justify-end">
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
                    {brand.name || brand.domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? (
            <div className="flex items-center justify-center py-8 text-red-500">
              Failed to load competitors
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !competitors || (competitors as any[]).length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No competitors found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Mentions</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(competitors) &&
                  competitors.map((competitor: any) => (
                    <TableRow key={competitor.id}>
                      <TableCell>{competitor.name}</TableCell>
                      <TableCell>{competitor.brand}</TableCell>
                      <TableCell>{competitor.mentions}</TableCell>
                      <TableCell>
                        {competitor.status === null && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleUpdateStatus(competitor.id, 'ACCEPTED')
                              }
                              className="h-5 w-5 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleUpdateStatus(competitor.id, 'REJECTED')
                              }
                              className="h-5 w-5 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {competitor.status === 'ACCEPTED' && (
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleUpdateStatus(competitor.id, null)
                              }
                              className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {competitor.status === 'REJECTED' && (
                          <div className="flex items-center gap-2">
                            <X className="h-4 w-4 text-red-500" />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleUpdateStatus(competitor.id, null)
                              }
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
