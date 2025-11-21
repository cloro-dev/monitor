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
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandFilter } from '@/components/brands/brand-filter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaginationControls } from '@/components/ui/pagination-controls';

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

interface URLStat {
  url: string;
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
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const { prompts, isLoading } = usePrompts(selectedBrand);
  const [activeTab, setActiveTab] = useState('domain');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const domainStats = useMemo(() => {
    if (!prompts) return [];

    const statsMap = new Map<string, DomainStat>();
    const processedPromptIds = new Set<string>();
    let totalPromptsWithResults = 0;

    prompts.forEach((prompt) => {
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
  }, [prompts]);

  const urlStats = useMemo(() => {
    if (!prompts) return [];

    const statsMap = new Map<string, URLStat>();
    const processedPromptIds = new Set<string>();
    let totalPromptsWithResults = 0;

    prompts.forEach((prompt) => {
      if (!prompt.results) return;

      const successfulResults = prompt.results.filter(
        (r) => r.status === 'SUCCESS' && r.response,
      );
      if (successfulResults.length > 0) {
        totalPromptsWithResults++;
        processedPromptIds.add(prompt.id);
      }

      successfulResults.forEach((result) => {
        const responseData = result.response as any;
        const sources = responseData?.result?.sources as
          | SourceItem[]
          | undefined;

        if (Array.isArray(sources)) {
          sources.forEach((source) => {
            try {
              if (!source.url) return;
              const urlObj = new URL(source.url);
              const cleanUrl = urlObj.origin + urlObj.pathname;

              if (!statsMap.has(cleanUrl)) {
                statsMap.set(cleanUrl, {
                  url: cleanUrl,
                  mentions: 0,
                  totalPosition: 0,
                  avgPosition: 0,
                  uniquePrompts: new Set(),
                  utilization: 0,
                });
              }

              const stat = statsMap.get(cleanUrl)!;
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
  }, [prompts]);

  // Pagination Logic
  const getPaginatedData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between space-y-2">
          <Skeleton className="h-6 w-[200px]" />
        </div>
        <Skeleton className="h-4 w-[300px]" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sources</h2>
          <p className="text-muted-foreground">
            Domains mentioned in AI search results across your prompts.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <BrandFilter value={selectedBrand} onChange={setSelectedBrand} />
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          setCurrentPage(1);
        }}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="domain">Domain</TabsTrigger>
          <TabsTrigger value="url">URL</TabsTrigger>
        </TabsList>

        <TabsContent value="domain">
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
                  getPaginatedData(domainStats).map((stat) => (
                    <TableRow key={stat.domain}>
                      <TableCell className="py-2 font-medium">
                        {stat.domain}
                      </TableCell>
                      <TableCell className="py-2">
                        {stat.utilization.toFixed(0)}%
                      </TableCell>
                      <TableCell className="py-2">{stat.mentions}</TableCell>
                      <TableCell className="py-2">
                        {stat.avgPosition.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {domainStats.length > itemsPerPage && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={Math.ceil(domainStats.length / itemsPerPage)}
              onPageChange={setCurrentPage}
            />
          )}
        </TabsContent>

        <TabsContent value="url">
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Mentions</TableHead>
                  <TableHead>Avg. Position</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urlStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No sources found in your tracking results.
                    </TableCell>
                  </TableRow>
                ) : (
                  getPaginatedData(urlStats).map((stat) => (
                    <TableRow key={stat.url}>
                      <TableCell
                        className="max-w-md truncate py-2 font-medium"
                        title={stat.url}
                      >
                        {stat.url}
                      </TableCell>
                      <TableCell className="py-2">
                        {stat.utilization.toFixed(0)}%
                      </TableCell>
                      <TableCell className="py-2">{stat.mentions}</TableCell>
                      <TableCell className="py-2">
                        {stat.avgPosition.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {urlStats.length > itemsPerPage && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={Math.ceil(urlStats.length / itemsPerPage)}
              onPageChange={setCurrentPage}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
