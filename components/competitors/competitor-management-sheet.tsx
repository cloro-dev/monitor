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
import { useCompetitors } from '@/hooks/use-competitors';
import { useBrands } from '@/hooks/use-brands';
import { Check, X } from 'lucide-react';
import { useState } from 'react';

interface CompetitorManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompetitorManagementSheet({
  open,
  onOpenChange,
}: CompetitorManagementSheetProps) {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const { competitors, isLoading, mutate } = useCompetitors(selectedBrand);
  const { brands } = useBrands();

  const handleUpdateStatus = async (
    brandId: string,
    name: string,
    status: 'ACCEPTED' | 'REJECTED',
  ) => {
    // Optimistic UI update
    mutate(
      (currentData: any[] | undefined) => {
        if (!currentData) return [];
        return currentData.map((c) =>
          c.brandId === brandId && c.name === name ? { ...c, status } : c,
        );
      },
      { revalidate: false },
    );

    // Send the update to the API
    await fetch('/api/competitors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ brandId, name, status }),
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
                    {brand.domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(competitors) &&
                  competitors.map((competitor: any) => (
                    <TableRow key={competitor.id}>
                      <TableCell>{competitor.name}</TableCell>
                      <TableCell>{competitor.brand}</TableCell>
                      <TableCell>
                        {competitor.status === null && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleUpdateStatus(
                                  competitor.brandId,
                                  competitor.name,
                                  'ACCEPTED',
                                )
                              }
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleUpdateStatus(
                                  competitor.brandId,
                                  competitor.name,
                                  'REJECTED',
                                )
                              }
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {competitor.status === 'ACCEPTED' && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                        {competitor.status === 'REJECTED' && (
                          <X className="h-4 w-4 text-red-500" />
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
