'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFaviconUrl } from '@/lib/utils';

interface Competitor {
  id: string;
  name: string;
  domain: string;
  visibilityScore: number | null;
  averageSentiment: number | null;
  averagePosition: number | null;
}

interface CompetitorMetricsTableProps {
  competitors: Competitor[];
}

export function CompetitorMetricsTable({
  competitors,
}: CompetitorMetricsTableProps) {
  return (
    <div className="relative w-full">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead className="w-[180px]">Competitor</TableHead>
            <TableHead className="text-right">Visibility</TableHead>
            <TableHead className="text-right">Sentiment</TableHead>
            <TableHead className="text-right">Position</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {competitors.map((comp) => (
            <TableRow key={comp.id}>
              <TableCell className="py-1 font-medium">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 rounded-sm">
                    <AvatarImage
                      src={getFaviconUrl(comp.domain)}
                      alt={comp.name}
                    />
                    <AvatarFallback className="rounded-sm text-[10px]">
                      {comp.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{comp.name}</span>
                </div>
              </TableCell>
              <TableCell className="py-1 text-right">
                {comp.visibilityScore != null
                  ? `${comp.visibilityScore.toFixed(0)}%`
                  : '-'}
              </TableCell>
              <TableCell className="py-1 text-right">
                {comp.averageSentiment != null
                  ? comp.averageSentiment.toFixed(1)
                  : '-'}
              </TableCell>
              <TableCell className="py-1 text-right">
                {comp.averagePosition != null
                  ? comp.averagePosition.toFixed(1)
                  : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
