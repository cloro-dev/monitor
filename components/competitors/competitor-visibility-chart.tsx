'use client';

import * as React from 'react';
import { getDaysFromTimeRange, TimeRange } from '@/lib/date-utils';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { DateRangeSelect } from '@/components/ui/date-range-select';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface CompetitorVisibilityChartProps {
  data: ChartDataPoint[];
  competitors: { id: string; name: string; color?: string }[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-1))', // Fallback/Repeat if more than 5
];

export function CompetitorVisibilityChart({
  data,
  competitors,
}: CompetitorVisibilityChartProps) {
  const [timeRange, setTimeRange] = React.useState('30d');

  const filteredData = React.useMemo(() => {
    const referenceDate = new Date();
    const daysToSubtract = getDaysFromTimeRange(timeRange as TimeRange);
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return data.filter((item) => {
      const date = new Date(item.date);
      return date >= startDate;
    });
  }, [data, timeRange]);

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    competitors.forEach((comp, index) => {
      config[comp.name] = {
        label: comp.name,
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [competitors]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <div className="space-y-1">
          <CardTitle>Competitor Visibility</CardTitle>
          <CardDescription>Visibility share over time</CardDescription>
        </div>
        <DateRangeSelect
          value={timeRange}
          onValueChange={setTimeRange}
          className="w-[160px] rounded-lg sm:ml-auto"
        />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart
            data={filteredData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              {competitors.map((comp) => (
                <linearGradient
                  key={comp.id}
                  id={`fill${comp.id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={chartConfig[comp.name]?.color}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={chartConfig[comp.name]?.color}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              ))}
            </defs>
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
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  }
                  valueFormatter={(value) => `${Number(value).toFixed(0)}%`}
                />
              }
            />
            {competitors.map((comp) => (
              <Area
                key={comp.id}
                dataKey={comp.name}
                type="monotone"
                fill={chartConfig[comp.name]?.color}
                fillOpacity={0.1}
                stroke={chartConfig[comp.name]?.color}
                strokeWidth={2}
                stackId={undefined}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
