'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCompetitors } from '@/hooks/use-competitors';
import { Skeleton } from '@/components/ui/skeleton';

interface CompetitorsTableProps {
  data?: any[] | null;
}

export function CompetitorsTable({ data }: CompetitorsTableProps) {
  const { competitors, isLoading, mutate } = useCompetitors();

  // Use provided data or fall back to fetched data
  const displayData = data ?? competitors;

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

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Brand</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.isArray(displayData) &&
          displayData.map((competitor: any) => (
            <TableRow key={competitor.id}>
              <TableCell>{competitor.name}</TableCell>
              <TableCell>{competitor.brand}</TableCell>
              <TableCell>
                {competitor.status === null && (
                  <>
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
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() =>
                        handleUpdateStatus(
                          competitor.brandId,
                          competitor.name,
                          'REJECTED',
                        )
                      }
                    >
                      Reject
                    </Button>
                  </>
                )}
                {competitor.status === 'ACCEPTED' && (
                  <span className="text-green-500">Accepted</span>
                )}
                {competitor.status === 'REJECTED' && (
                  <span className="text-red-500">Rejected</span>
                )}
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
