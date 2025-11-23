'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Competitor {
  id: string;
  name: string;
  domain: string;
  mentions: number;
  visibilityScore: number | null;
  averageSentiment: number | null;
  averagePosition: number | null;
  status: 'ACCEPTED' | 'REJECTED' | null;
}

interface CompetitorsTableProps {
  data: Competitor[];
}

export function CompetitorsTable({ data }: CompetitorsTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-medium">No competitors found</h3>
          <p className="mb-4 text-muted-foreground">
            Try adjusting your filters or wait for more tracking results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Competitor</TableHead>
            <TableHead>Mentions</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead>Sentiment</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((competitor) => (
            <TableRow key={competitor.id}>
              <TableCell className="py-2 align-middle font-medium">
                <div>
                  <div className="font-semibold">{competitor.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {competitor.domain}
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-2 align-middle">
                {competitor.mentions}
              </TableCell>
              <TableCell className="py-2 align-middle">
                {competitor.visibilityScore != null
                  ? `${competitor.visibilityScore.toFixed(0)}%`
                  : '-'}
              </TableCell>
              <TableCell className="py-2 align-middle">
                {competitor.averageSentiment != null
                  ? competitor.averageSentiment.toFixed(1)
                  : '-'}
              </TableCell>
              <TableCell className="py-2 align-middle">
                {competitor.averagePosition != null
                  ? competitor.averagePosition.toFixed(1)
                  : '-'}
              </TableCell>
              <TableCell className="py-2 align-middle">
                {competitor.status === 'ACCEPTED' && (
                  <Badge
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Accepted
                  </Badge>
                )}
                {competitor.status === 'REJECTED' && (
                  <Badge variant="destructive">Rejected</Badge>
                )}
                {competitor.status === null && (
                  <Badge variant="secondary">Pending</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
