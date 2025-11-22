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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFaviconUrl } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  subDays,
  isWithinInterval,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  format,
  isSameDay,
} from 'date-fns';

type DateRange = {
  from: Date | undefined;
  to?: Date | undefined;
};

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface SourceItem {
  url: string;
  label: string;
  position: number;
  description: string;
}

interface DbSource {
  url: string;
  hostname: string;
  type?: string | null;
}

interface DomainStat {
  domain: string;
  mentions: number;
  totalPosition: number;
  avgPosition: number;
  uniquePrompts: Set<string>;
  utilization: number;
  type?: string;
}

interface URLStat {
  url: string;
  hostname: string;
  mentions: number;
  totalPosition: number;
  avgPosition: number;
  uniquePrompts: Set<string>;
  utilization: number;
  type?: string;
}

const typeStyles: Record<string, string> = {
  NEWS: 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300',
  BLOG: 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300',
  SOCIAL_MEDIA:
    'bg-sky-100 text-sky-800 hover:bg-sky-100 dark:bg-sky-900 dark:text-sky-300',
  FORUM:
    'bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900 dark:text-orange-300',
  CORPORATE:
    'bg-slate-100 text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
  E_COMMERCE:
    'bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-300',
  WIKI: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-300',
  GOVERNMENT:
    'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-300',
  REVIEW:
    'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300',
  OTHER:
    'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300',
};

const formatType = (type: string) => {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

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
  const [timeRange, setTimeRange] = useState('30d');
  const itemsPerPage = 15;

  const date = useMemo<DateRange>(() => {
    const end = new Date();
    let days = 30;
    if (timeRange === '7d') days = 7;
    if (timeRange === '90d') days = 90;
    return {
      from: subDays(end, days),
      to: end,
    };
  }, [timeRange]);

  // 1. Filter results by date range
  const filteredResults = useMemo(() => {
    if (!prompts || !date?.from || !date?.to) return [];

    const from = startOfDay(date.from);
    const to = endOfDay(date.to);
    const results: {
      promptId: string;
      result: any;
      createdAt: Date;
    }[] = [];

    prompts.forEach((prompt) => {
      if (!prompt.results) return;
      prompt.results.forEach((r) => {
        const createdAt = new Date(r.createdAt);
        if (
          r.status === 'SUCCESS' &&
          isWithinInterval(createdAt, { start: from, end: to })
        ) {
          results.push({
            promptId: prompt.id,
            result: r,
            createdAt,
          });
        }
      });
    });
    return results;
  }, [prompts, date]);

  // 2. Compute Stats (Domain and URL) based on filtered results
  const stats = useMemo(() => {
    const domainMap = new Map<string, DomainStat>();
    const urlMap = new Map<string, URLStat>();
    const processedPromptIds = new Set<string>();

    filteredResults.forEach(({ promptId, result }) => {
      processedPromptIds.add(promptId);

      const dbSources = result.sources as DbSource[] | undefined;
      const legacySources = (result.response as any)?.result?.sources as
        | SourceItem[]
        | undefined;

      // Helper to process a source item (normalized)
      const processSource = (
        url: string,
        position: number | undefined,
        type?: string | null,
      ) => {
        try {
          if (!url) return;
          const urlObj = new URL(url);
          const hostname = urlObj.hostname.replace(/^www\./, '');
          const domain = getRootDomain(hostname);
          const cleanUrl = urlObj.origin + urlObj.pathname;

          // Domain Stats
          if (!domainMap.has(domain)) {
            domainMap.set(domain, {
              domain,
              mentions: 0,
              totalPosition: 0,
              avgPosition: 0,
              uniquePrompts: new Set(),
              utilization: 0,
              type: type || undefined,
            });
          }
          const dStat = domainMap.get(domain)!;
          dStat.mentions += 1;
          dStat.uniquePrompts.add(promptId);
          if (typeof position === 'number') {
            dStat.totalPosition += position;
          }
          // Update type if we found a better one (e.g. from DB)
          if (type && !dStat.type) dStat.type = type;

          // URL Stats
          if (!urlMap.has(cleanUrl)) {
            urlMap.set(cleanUrl, {
              url: cleanUrl,
              hostname,
              mentions: 0,
              totalPosition: 0,
              avgPosition: 0,
              uniquePrompts: new Set(),
              utilization: 0,
              type: type || undefined,
            });
          }
          const uStat = urlMap.get(cleanUrl)!;
          uStat.mentions += 1;
          uStat.uniquePrompts.add(promptId);
          if (typeof position === 'number') {
            uStat.totalPosition += position;
          }
          // Update type if we found a better one
          if (type && !uStat.type) uStat.type = type;
        } catch (e) {
          // Invalid URL
        }
      };

      // Use DB sources if available (preferred)
      if (dbSources && dbSources.length > 0) {
        dbSources.forEach((source) => {
          // Try to find matching legacy source to extract position
          let position: number | undefined = undefined;

          if (Array.isArray(legacySources)) {
            const match = legacySources.find((ls) => ls.url === source.url);
            if (match) position = match.position;
          }

          processSource(source.url, position, source.type);
        });
      }
      // If no DB sources, we skip. Since DB is reset, we assume data will be correct going forward.
    });

    const totalPrompts = processedPromptIds.size;

    const domainStatsArray = Array.from(domainMap.values())
      .map((stat) => ({
        ...stat,
        avgPosition: stat.mentions > 0 ? stat.totalPosition / stat.mentions : 0,
        utilization:
          totalPrompts > 0 ? (stat.uniquePrompts.size / totalPrompts) * 100 : 0,
      }))
      .sort((a, b) => b.utilization - a.utilization);

    const urlStatsArray = Array.from(urlMap.values())
      .map((stat) => ({
        ...stat,
        avgPosition: stat.mentions > 0 ? stat.totalPosition / stat.mentions : 0,
        utilization:
          totalPrompts > 0 ? (stat.uniquePrompts.size / totalPrompts) * 100 : 0,
      }))
      .sort((a, b) => b.utilization - a.utilization);

    return { domainStats: domainStatsArray, urlStats: urlStatsArray };
  }, [filteredResults]);

  // 3. Prepare Chart Data
  const chartData = useMemo(() => {
    if (!date?.from || !date?.to) return { data: [], config: {} };

    const topItems =
      activeTab === 'domain'
        ? stats.domainStats.slice(0, 5)
        : stats.urlStats.slice(0, 5);

    if (topItems.length === 0) return { data: [], config: {} };

    const days = eachDayOfInterval({ start: date.from, end: date.to });

    const config: ChartConfig = {};
    const chartColors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ];

    topItems.forEach((item, index) => {
      const key =
        activeTab === 'domain'
          ? (item as DomainStat).domain
          : (item as URLStat).url;

      let label = key;

      if (activeTab === 'url') {
        label = label.replace(/^(https?:\/\/)?(www\.)?/, '');

        if (label.length > 30) {
          label = `${label.substring(0, 27)}...`;
        }
      }

      const safeId = `item_${index}`;

      config[safeId] = {
        label: label,

        color: chartColors[index % chartColors.length],
      };
    });

    const data = days.map((day) => {
      const dayResults = filteredResults.filter((r) =>
        isSameDay(r.createdAt, day),
      );
      const totalPromptsOnDay = new Set(dayResults.map((r) => r.promptId)).size;

      const dayData: any = { date: format(day, 'yyyy-MM-dd') };

      topItems.forEach((item, index) => {
        const safeId = `item_${index}`;
        const key =
          activeTab === 'domain'
            ? (item as DomainStat).domain
            : (item as URLStat).url;

        if (totalPromptsOnDay === 0) {
          dayData[safeId] = 0;
          return;
        }

        // Count prompts on this day where this item appeared
        const uniquePromptsWithItemOnDay = new Set();
        dayResults.forEach(({ promptId, result }) => {
          const responseData = result.response as any;
          const sources = responseData?.result?.sources as
            | SourceItem[]
            | undefined;
          if (Array.isArray(sources)) {
            sources.forEach((s) => {
              try {
                if (!s.url) return;
                const u = new URL(s.url);
                let match = false;
                if (activeTab === 'domain') {
                  const h = u.hostname.replace(/^www\./, '');
                  if (getRootDomain(h) === key) match = true;
                } else {
                  if (u.origin + u.pathname === key) match = true;
                }
                if (match) uniquePromptsWithItemOnDay.add(promptId);
              } catch (e) {}
            });
          }
        });

        dayData[safeId] =
          (uniquePromptsWithItemOnDay.size / totalPromptsOnDay) * 100;
      });

      return dayData;
    });

    return { data, config };
  }, [stats, activeTab, filteredResults, date]);

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
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-10 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full" />
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sources</h2>
          <p className="text-muted-foreground">
            Domains mentioned in AI search results across your prompts.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
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
        <div className="mb-2 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="domain">Domain</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
          </TabsList>
        </div>

        {/* Chart Section */}
        <Card className="mb-2">
          <CardHeader>
            <CardTitle>
              {activeTab === 'domain' ? 'Top domains' : 'Top URLs'} utilization
              over time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartData.config}
              className="h-[200px] w-full"
            >
              <AreaChart data={chartData.data} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  domain={[0, 100]}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        });
                      }}
                    />
                  }
                />
                {Object.keys(chartData.config).map((key) => (
                  <Area
                    key={key}
                    dataKey={key}
                    type="monotone"
                    fill={chartData.config[key].color}
                    fillOpacity={0.1}
                    stroke={chartData.config[key].color}
                    stackId={undefined}
                    strokeWidth={2}
                  />
                ))}
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <TabsContent value="domain">
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Mentions</TableHead>
                  <TableHead>Avg. Position</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.domainStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No sources found in your tracking results.
                    </TableCell>
                  </TableRow>
                ) : (
                  getPaginatedData(stats.domainStats).map((stat) => (
                    <TableRow key={stat.domain}>
                      <TableCell className="py-2 font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5 rounded-sm">
                            <AvatarImage
                              src={getFaviconUrl(stat.domain)}
                              alt={stat.domain}
                            />
                            <AvatarFallback className="rounded-sm text-[10px]">
                              {stat.domain.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {stat.domain}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {stat.type ? (
                          <Badge
                            variant="secondary"
                            className={
                              typeStyles[stat.type] || typeStyles.OTHER
                            }
                          >
                            {formatType(stat.type)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
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
          {stats.domainStats.length > itemsPerPage && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={Math.ceil(stats.domainStats.length / itemsPerPage)}
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
                  <TableHead>Type</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Mentions</TableHead>
                  <TableHead>Avg. Position</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.urlStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No sources found in your tracking results.
                    </TableCell>
                  </TableRow>
                ) : (
                  getPaginatedData(stats.urlStats).map((stat) => (
                    <TableRow key={stat.url}>
                      <TableCell
                        className="max-w-md truncate py-2 font-medium"
                        title={stat.url}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5 rounded-sm">
                            <AvatarImage
                              src={getFaviconUrl(stat.hostname)}
                              alt={stat.url}
                            />
                            <AvatarFallback className="rounded-sm text-[10px]">
                              U
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{stat.url}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {stat.type ? (
                          <Badge
                            variant="secondary"
                            className={
                              typeStyles[stat.type] || typeStyles.OTHER
                            }
                          >
                            {formatType(stat.type)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
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
          {stats.urlStats.length > itemsPerPage && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={Math.ceil(stats.urlStats.length / itemsPerPage)}
              onPageChange={setCurrentPage}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
