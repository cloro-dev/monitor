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
  const { competitors, isLoading, mutate, error } = useCompetitors();

  // Use provided data or fall back to fetched data
  const displayData = data ?? competitors;

  const handleUpdateStatus = async (
    id: string,
    status: 'ACCEPTED' | 'REJECTED',
  ) => {
    // Optimistic UI update
    mutate(
      (currentData: any[] | undefined) => {
        if (!currentData) return [];
        return currentData.map((c) => (c.id === id ? { ...c, status } : c));
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

  if (error) {
    return <div className="text-red-500">Failed to load competitors.</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!displayData || (displayData as any[]).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">No competitors found.</p>
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
                        handleUpdateStatus(competitor.id, 'ACCEPTED')
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() =>
                        handleUpdateStatus(competitor.id, 'REJECTED')
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
