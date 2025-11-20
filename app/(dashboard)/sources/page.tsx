'use client';

import { usePrompts } from '@/hooks/use-prompts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useBrands } from '@/hooks/use-brands';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SourceItem {
  url: string;
  label: string;
  position: number;
  description: string;
}

interface DomainStat {
  domain: string;
  mentions: number;
  totalPosition: number;
  avgPosition: number;
  uniquePrompts: Set<string>;
  utilization: number;
}

function getRootDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;

  // Common SLDs (Second Level Domains) that act like TLDs
  const publicSuffixes = [
    'co',
    'com',
    'org',
    'net',
    'edu',
    'gov',
    'mil',
    'int',
    'ac',
  ];

  const secondLast = parts[parts.length - 2];
  const last = parts[parts.length - 1];

  // Check for patterns like .co.uk, .com.au, .org.br
  // If the TLD is 2 chars (country code) and the SLD is in our list
  if (last.length === 2 && publicSuffixes.includes(secondLast)) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

export default function SourcesPage() {
  const { prompts, isLoading } = usePrompts();
  const { brands } = useBrands();
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];
    if (!selectedBrand || selectedBrand === 'all') return prompts;
    return prompts.filter((prompt) => prompt.brandId === selectedBrand);
  }, [prompts, selectedBrand]);

  const domainStats = useMemo(() => {
    if (!filteredPrompts) return [];

    const statsMap = new Map<string, DomainStat>();
    const processedPromptIds = new Set<string>();
    let totalPromptsWithResults = 0;

    filteredPrompts.forEach((prompt) => {
      if (!prompt.results) return;

      const successfulResults = prompt.results.filter(
        (r) => r.status === 'SUCCESS' && r.response,
      );
      if (successfulResults.length > 0) {
        totalPromptsWithResults++;
        processedPromptIds.add(prompt.id);
      }

      successfulResults.forEach((result) => {
        // Parse response.
        // Assuming structure: { result: { sources: SourceItem[] } }
        const responseData = result.response as any;
        const sources = responseData?.result?.sources as
          | SourceItem[]
          | undefined;

        if (Array.isArray(sources)) {
          sources.forEach((source) => {
            try {
              if (!source.url) return;
              const url = new URL(source.url);
              const hostname = url.hostname.replace(/^www\./, '');
              const domain = getRootDomain(hostname);

              if (!statsMap.has(domain)) {
                statsMap.set(domain, {
                  domain,
                  mentions: 0,
                  totalPosition: 0,
                  avgPosition: 0,
                  uniquePrompts: new Set(),
                  utilization: 0,
                });
              }

              const stat = statsMap.get(domain)!;
              stat.mentions += 1;
              stat.uniquePrompts.add(prompt.id);

              if (typeof source.position === 'number') {
                stat.totalPosition += source.position;
              }
            } catch (e) {
              // Invalid URL, ignore
            }
          });
        }
      });
    });

    return Array.from(statsMap.values())
      .map((stat) => ({
        ...stat,
        avgPosition: stat.mentions > 0 ? stat.totalPosition / stat.mentions : 0,
        utilization:
          totalPromptsWithResults > 0
            ? (stat.uniquePrompts.size / totalPromptsWithResults) * 100
            : 0,
      }))
      .sort((a, b) => b.utilization - a.utilization);
  }, [filteredPrompts]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between space-y-2">
              <Skeleton className="h-6 w-[200px]" />
            </div>
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sources</CardTitle>
              <CardDescription>
                Domains mentioned in AI search results across your prompts.
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Mentions</TableHead>
                  <TableHead>Avg. Position</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domainStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No sources found in your tracking results.
                    </TableCell>
                  </TableRow>
                ) : (
                  domainStats.map((stat) => (
                    <TableRow key={stat.domain}>
                      <TableCell className="font-medium">
                        {stat.domain}
                      </TableCell>
                      <TableCell>{stat.utilization.toFixed(0)}%</TableCell>
                      <TableCell>{stat.mentions}</TableCell>
                      <TableCell>{stat.avgPosition.toFixed(1)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
