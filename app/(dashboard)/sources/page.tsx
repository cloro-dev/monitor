'use client';

import { useSources, DomainStat, URLStat } from '@/hooks/use-sources';
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
import { DateRangeSelect } from '@/components/ui/date-range-select';
import { subDays, eachDayOfInterval, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { usePagePreferences } from '@/hooks/use-page-preferences';
import { defaultSourcesPreferences } from '@/lib/preference-defaults';

type TimeRange = '7d' | '30d' | '90d';

type DateRange = {
  from: Date | undefined;
  to?: Date | undefined;
};

// Type styles for source badges
const typeStyles: Record<string, string> = {
  NEWS: 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300',
  BLOG: 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300',
  SOCIAL_MEDIA:
    'bg-sky-100 text-sky-800 hover:bg-sky-100 dark:bg-sky-900 dark:text-sky-300',
  FORUM:
    'bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900 dark:text-orange-300',
  CORPORATE:
    'bg-slate-100 text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
  ECOMMERCE:
    'bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-300',
  VIDEO:
    'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-300',
  REVIEW:
    'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300',
  OTHER:
    'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300',
};

const formatType = (type: string) => {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

export default function SourcesPage() {
  // Preference management
  const { preferences, updatePreference, updateMultiplePreferences } =
    usePagePreferences('sources', defaultSourcesPreferences);

  // Local state for pagination (not persisted)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Memoize query parameters to prevent unnecessary re-renders
  const queryParams = useMemo(
    () => ({
      brandId: preferences.brandId || null,
      timeRange: preferences.timeRange,
      tab: preferences.tab,
      page: currentPage,
      limit: itemsPerPage,
    }),
    [preferences.brandId, preferences.timeRange, preferences.tab, currentPage],
  );

  // Get date range for filtering
  const date = useMemo<DateRange>(() => {
    const end = new Date();
    let days = 30;
    if (preferences.timeRange === '7d') days = 7;
    if (preferences.timeRange === '90d') days = 90;
    return {
      from: subDays(end, days),
      to: end,
    };
  }, [preferences.timeRange]);

  // Fetch sources data with optimized hook
  const { data, isLoading } = useSources(queryParams);

  // Get current stats for pagination
  const currentStats = useMemo(() => {
    if (!data) return [];
    return preferences.tab === 'domain' ? data.domainStats : data.urlStats;
  }, [data, preferences.tab]);

  // Generate chart data for top items (original client-side logic)
  const chartData = useMemo(() => {
    if (!date?.from || !date?.to) return { data: [], config: {} };

    const topItems =
      preferences.tab === 'domain'
        ? currentStats.slice(0, 5)
        : currentStats.slice(0, 5);

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

    topItems.forEach((item: DomainStat | URLStat, index: number) => {
      const key =
        preferences.tab === 'domain'
          ? (item as DomainStat).domain
          : (item as URLStat).url;

      let label = key;

      if (preferences.tab === 'url') {
        label = label.replace(/^(https?:\/\/)?(www\.)?/, '');

        if (label.length > 20) {
          label = `${label.substring(0, 17)}...`;
        }
      }

      const safeId = `item_${index}`;

      config[safeId] = {
        label,
        color: chartColors[index],
      };
    });

    // Generate simplified chart data (matches original behavior)
    const data = days.map((day) => {
      const dayData: any = {
        date: format(day, 'MMM dd'),
      };

      topItems.forEach((_: DomainStat | URLStat, index: number) => {
        const safeId = `item_${index}`;
        dayData[safeId] = Math.floor(Math.random() * 10) + 1; // Placeholder data matching original
      });

      return dayData;
    });

    return { data, config };
  }, [currentStats, preferences.tab, date]);

  // Sorting and pagination logic
  const totalPages = data?.pagination.totalPages || 1;
  const sortedStats = useMemo(() => {
    return [...currentStats].sort((a, b) => {
      const aValue =
        preferences.sortBy === 'mentions' ? a.mentions : a.utilization;
      const bValue =
        preferences.sortBy === 'mentions' ? b.mentions : b.utilization;

      if (preferences.sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  }, [currentStats, preferences.sortBy, preferences.sortOrder]);

  const paginatedStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedStats.slice(startIndex, endIndex);
  }, [sortedStats, currentPage, itemsPerPage]);

  // Compute type stats for sidebar
  const typeStats = useMemo(() => {
    const allStats = currentStats;
    const typeMap = new Map<string, number>();
    let total = 0;

    allStats.forEach((stat: DomainStat | URLStat) => {
      const type = stat.type || 'OTHER';
      const count = stat.mentions;
      typeMap.set(type, (typeMap.get(type) || 0) + count);
      total += count;
    });

    return Array.from(typeMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [currentStats]);

  // Handler functions
  const handleTabChange = (val: string) => {
    updatePreference('tab', val as 'domain' | 'url');
    setCurrentPage(1);
  };

  const handleTimeRangeChange = (val: string) => {
    updatePreference('timeRange', val as TimeRange);
    setCurrentPage(1);
  };

  const handleBrandChange = (val: string | null) => {
    updatePreference('brandId', val);
    setCurrentPage(1);
  };

  const handleSort = (column: 'mentions' | 'utilization') => {
    const newSortOrder =
      preferences.sortBy === column
        ? preferences.sortOrder === 'asc'
          ? 'desc'
          : 'asc'
        : 'desc';

    // Update both preferences atomically
    updateMultiplePreferences({
      sortBy: column,
      sortOrder: newSortOrder,
    });

    setCurrentPage(1);
  };

  // Loading skeleton
  if (isLoading && !data) {
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
            Domains mentioned in AI search results across your prompts
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <DateRangeSelect
            value={preferences.timeRange}
            onValueChange={handleTimeRangeChange}
            className="w-[160px]"
          />
          <BrandFilter
            value={preferences.brandId}
            onChange={handleBrandChange}
          />
        </div>
      </div>

      <Tabs
        value={preferences.tab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="mb-2 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="domain">Domain</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
          </TabsList>
        </div>

        <div className="mb-2 grid gap-4 md:grid-cols-3">
          {/* Chart Section */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                {preferences.tab === 'domain' ? 'Top domains' : 'Top URLs'}{' '}
                utilization over time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!preferences.brandId ? (
                <div className="flex h-[200px] items-center justify-center rounded-md border-dashed">
                  <p className="text-center text-muted-foreground">
                    Select a brand to view{' '}
                    {preferences.tab === 'domain' ? 'domain' : 'URL'}{' '}
                    utilization trends
                  </p>
                </div>
              ) : chartData.data.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center rounded-md border-dashed">
                  <p className="text-center text-muted-foreground">
                    No {preferences.tab === 'domain' ? 'domain' : 'URL'} data
                    available for this brand yet
                  </p>
                </div>
              ) : (
                <ChartContainer
                  config={chartData.config}
                  className="h-[200px] w-full"
                >
                  <AreaChart
                    data={chartData.data}
                    margin={{ left: 12, right: 12 }}
                  >
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
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
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
                          valueFormatter={(value) =>
                            `${Number(value).toFixed(0)}%`
                          }
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
              )}
            </CardContent>
          </Card>

          {/* Source Type Panel */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Source type</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {!preferences.brandId ? (
                <div className="flex h-32 items-center justify-center rounded-md border-dashed">
                  <p className="text-center text-muted-foreground">
                    Select a brand to view source type distribution
                  </p>
                </div>
              ) : typeStats.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-md border-dashed">
                  <p className="text-center text-muted-foreground">
                    No source type data available for this brand yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {typeStats.slice(0, 6).map((stat) => (
                    <div key={stat.type} className="flex items-center gap-1">
                      <div className="w-32">
                        <Badge
                          variant="secondary"
                          className={typeStyles[stat.type] || typeStyles.OTHER}
                        >
                          {formatType(stat.type)}
                        </Badge>
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary/50"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-muted-foreground">
                        {stat.percentage.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <TabsContent value="domain">
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('utilization')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Utilization
                      {preferences.sortBy === 'utilization' ? (
                        preferences.sortOrder === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('mentions')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Mentions
                      {preferences.sortBy === 'mentions' ? (
                        preferences.sortOrder === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4" />
                      )}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!preferences.brandId ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div>
                        <p className="font-medium">
                          Select a brand to view sources
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Choose a brand from the filter to see sources
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !data?.domainStats || data.domainStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No sources found in your tracking results.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStats.map(
                    (stat: DomainStat | URLStat, index: number) => (
                      <TableRow
                        key={(stat as DomainStat).domain || `domain-${index}`}
                      >
                        <TableCell className="py-2 font-medium">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5 rounded-sm">
                              <AvatarImage
                                src={getFaviconUrl(
                                  (stat as DomainStat).domain || '',
                                )}
                                alt={
                                  (stat as DomainStat).domain ||
                                  'Unknown domain'
                                }
                              />
                              <AvatarFallback className="rounded-sm text-[10px]">
                                {(stat as DomainStat).domain?.charAt(0) ||
                                  '?'.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {(stat as DomainStat).domain || 'Unknown domain'}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          {stat.type ? (
                            <Badge
                              className={
                                typeStyles[stat.type] || typeStyles.OTHER
                              }
                            >
                              {formatType(stat.type)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              Unknown
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          {stat.utilization.toFixed(1)}%
                        </TableCell>
                        <TableCell className="py-2">{stat.mentions}</TableCell>
                      </TableRow>
                    ),
                  )
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-4">
                <div className="text-sm text-muted-foreground">
                  Showing {paginatedStats.length} of{' '}
                  {data?.domainStats?.length || 0} results (Page {currentPage}{' '}
                  of {totalPages})
                </div>
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(newPage) => setCurrentPage(newPage)}
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="url">
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('utilization')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Utilization
                      {preferences.sortBy === 'utilization' ? (
                        preferences.sortOrder === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('mentions')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Mentions
                      {preferences.sortBy === 'mentions' ? (
                        preferences.sortOrder === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4" />
                      )}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!preferences.brandId ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div>
                        <p className="font-medium">
                          Select a brand to view sources
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Choose a brand from the filter to see sources
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !data?.urlStats || data.urlStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No sources found in your tracking results.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStats.map(
                    (stat: DomainStat | URLStat, index: number) => (
                      <TableRow key={(stat as URLStat).url || `url-${index}`}>
                        <TableCell className="max-w-xs truncate py-2 font-medium">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5 rounded-sm">
                              <AvatarImage
                                src={getFaviconUrl(
                                  (stat as URLStat).hostname || '',
                                )}
                                alt={
                                  (stat as URLStat).hostname ||
                                  'Unknown hostname'
                                }
                              />
                              <AvatarFallback className="rounded-sm text-[10px]">
                                {(stat as URLStat).hostname?.charAt(0) ||
                                  '?'.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {(stat as URLStat).url || 'Unknown URL'}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          {stat.type ? (
                            <Badge
                              className={
                                typeStyles[stat.type] || typeStyles.OTHER
                              }
                            >
                              {formatType(stat.type)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              Unknown
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          {stat.utilization.toFixed(1)}%
                        </TableCell>
                        <TableCell className="py-2">{stat.mentions}</TableCell>
                      </TableRow>
                    ),
                  )
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-4">
                <div className="text-sm text-muted-foreground">
                  Showing {paginatedStats.length} of{' '}
                  {data?.urlStats?.length || 0} results (Page {currentPage} of{' '}
                  {totalPages})
                </div>
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(newPage) => setCurrentPage(newPage)}
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
